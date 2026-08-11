/**
 * Small same-origin API for the Worker deployment.
 *
 * The editor remains local-first. Cloud endpoints are deliberately protected:
 * they accept a verified Cloudflare Access request or a server-side bearer
 * token, never a token embedded in the browser bundle.
 */

interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}

interface D1Database {
  prepare(query: string): D1Statement;
}

interface R2Object {
  body: ReadableStream<Uint8Array>;
  httpMetadata?: { contentType?: string };
  httpEtag?: string;
}

interface R2Bucket {
  put(
    key: string,
    value: ArrayBuffer | Uint8Array,
    options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> },
  ): Promise<unknown>;
  get(key: string): Promise<R2Object | null>;
}

export interface WorkerEnv {
  DB?: D1Database;
  R2_ASSETS?: R2Bucket;
  GITHUB_TOKEN?: string;
  APP_API_TOKEN?: string;
  APP_VERSION?: string;
}

const REPOSITORY = "Tonyus-dev/kallistis_producao";
const REF = "main";
const ALLOWED_PREFIXES = [
  "assets/povos/",
  "assets/oficios/",
  "assets/simbolos/",
  "assets/cosmologia_historia/",
  "assets/geografia/",
  "assets/frames/",
  "assets/forms/",
];
const MAX_SNAPSHOT_BYTES = 900_000;
const MAX_GITHUB_ASSET_BYTES = 20_000_000;

function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

function isAccessRequest(request: Request): boolean {
  return Boolean(
    request.headers.get("cf-access-authenticated-user-email") &&
    request.headers.get("cf-access-jwt-assertion"),
  );
}

function isAuthorized(request: Request, env: WorkerEnv): boolean {
  if (isAccessRequest(request)) return true;
  const expected = env.APP_API_TOKEN;
  const actual = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return Boolean(expected && actual && expected === actual);
}

function unauthorized(): Response {
  return json({ ok: false, error: "authentication_required" }, 401, {
    "www-authenticate": "Bearer",
  });
}

function badRequest(message: string): Response {
  return json({ ok: false, error: message }, 400);
}

function validProjectId(value: string): boolean {
  return /^[a-z0-9][a-z0-9._-]{0,79}$/i.test(value);
}

function validGitHubPath(value: string): boolean {
  return (
    value.length <= 240 &&
    !value.includes("..") &&
    !value.startsWith("/") &&
    ALLOWED_PREFIXES.some((prefix) => value.startsWith(prefix))
  );
}

function githubHeaders(token: string): HeadersInit {
  return {
    accept: "application/vnd.github+json",
    authorization: `Bearer ${token}`,
    "x-github-api-version": "2022-11-28",
    "user-agent": "kallistis-book-maker",
  };
}

function githubUrl(path: string): string {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `https://api.github.com/repos/${REPOSITORY}/contents/${encodedPath}?ref=${REF}`;
}

function assetContentType(path: string): string {
  const extension = path.split(".").pop()?.toLowerCase();
  return (
    {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      webp: "image/webp",
      svg: "image/svg+xml",
      pdf: "application/pdf",
      json: "application/json",
    }[extension ?? ""] ?? "application/octet-stream"
  );
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value = await request.json();
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function snapshotBytes(snapshot: unknown): { json: string; bytes: number } | null {
  try {
    const serialized = JSON.stringify(snapshot);
    const bytes = new TextEncoder().encode(serialized).byteLength;
    if (bytes > MAX_SNAPSHOT_BYTES) return null;
    return { json: serialized, bytes };
  } catch {
    return null;
  }
}

async function listProjects(env: WorkerEnv): Promise<Response> {
  if (!env.DB) return json({ ok: false, error: "d1_unavailable" }, 503);
  const result = await env.DB.prepare(
    "SELECT id, name, schema_version, current_revision, created_at, updated_at FROM projects ORDER BY updated_at DESC",
  ).all();
  return json({ ok: true, projects: result.results });
}

async function getProject(env: WorkerEnv, id: string): Promise<Response> {
  if (!env.DB) return json({ ok: false, error: "d1_unavailable" }, 503);
  const project = await env.DB.prepare("SELECT * FROM projects WHERE id = ?1")
    .bind(id)
    .first<Record<string, unknown>>();
  if (!project) return json({ ok: false, error: "project_not_found" }, 404);
  const revision = await env.DB.prepare(
    "SELECT revision, checksum, snapshot_json, created_at FROM project_revisions WHERE project_id = ?1 ORDER BY revision DESC LIMIT 1",
  )
    .bind(id)
    .first<Record<string, unknown>>();
  let snapshot: unknown = null;
  if (typeof revision?.["snapshot_json"] === "string") {
    try {
      snapshot = JSON.parse(revision["snapshot_json"]);
    } catch {
      return json({ ok: false, error: "stored_snapshot_invalid" }, 500);
    }
  }
  return json({ ok: true, project, revision, snapshot });
}

async function saveSnapshot(request: Request, env: WorkerEnv, id: string): Promise<Response> {
  if (!env.DB) return json({ ok: false, error: "d1_unavailable" }, 503);
  const body = await readJson(request);
  if (!body || !("snapshot" in body)) return badRequest("snapshot_required");
  const packed = snapshotBytes(body["snapshot"]);
  if (!packed) return badRequest("snapshot_too_large_or_not_serializable");
  const rawBaseRevision = body["baseRevision"];
  const baseRevision: number | null =
    rawBaseRevision === null ? null : Number(rawBaseRevision ?? 0);
  if (baseRevision !== null && (!Number.isInteger(baseRevision) || baseRevision < 0)) {
    return badRequest("invalid_base_revision");
  }
  const now = new Date().toISOString();
  const current = await env.DB.prepare("SELECT current_revision FROM projects WHERE id = ?1")
    .bind(id)
    .first<{ current_revision: number }>();
  const currentRevision = Number(current?.current_revision ?? 0);
  if (current && baseRevision !== null && baseRevision !== currentRevision) {
    return json({ ok: false, error: "revision_conflict", currentRevision }, 409);
  }
  if (!current) {
    const rawName = body["name"];
    const name = typeof rawName === "string" && rawName.trim() ? rawName.trim() : id;
    await env.DB.prepare(
      "INSERT INTO projects (id, name, schema_version, current_revision, created_at, updated_at) VALUES (?1, ?2, 1, 0, ?3, ?3)",
    )
      .bind(id, name.slice(0, 160), now)
      .run();
  }
  const revision = currentRevision + 1;
  const checksum = await crypto.subtle
    .digest("SHA-256", new TextEncoder().encode(packed.json))
    .then((buffer) =>
      [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join(""),
    );
  await env.DB.prepare(
    "INSERT INTO project_revisions (id, project_id, revision, object_key, checksum, snapshot_json, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
  )
    .bind(
      `${id}:${revision}`,
      id,
      revision,
      `projects/${id}/revisions/${revision}.json`,
      checksum,
      packed.json,
      now,
    )
    .run();
  await env.DB.prepare("UPDATE projects SET current_revision = ?1, updated_at = ?2 WHERE id = ?3")
    .bind(revision, now, id)
    .run();
  return json({ ok: true, id, revision, checksum, bytes: packed.bytes });
}

async function githubTree(env: WorkerEnv): Promise<Response> {
  if (!env.GITHUB_TOKEN) return json({ ok: false, error: "github_source_not_configured" }, 503);
  const response = await fetch(
    `https://api.github.com/repos/${REPOSITORY}/git/trees/${REF}?recursive=1`,
    { headers: githubHeaders(env.GITHUB_TOKEN) },
  );
  if (!response.ok) return json({ ok: false, error: "github_tree_failed" }, 502);
  const payload = (await response.json()) as {
    tree?: Array<{ path?: string; type?: string; sha?: string; size?: number }>;
  };
  const assets = (payload.tree ?? [])
    .filter(
      (entry) =>
        entry.type === "blob" && typeof entry.path === "string" && validGitHubPath(entry.path),
    )
    .map((entry) => ({
      path: entry.path,
      sha: entry.sha,
      size: entry.size ?? null,
      mime: assetContentType(entry.path!),
    }));
  return json({ ok: true, repository: REPOSITORY, ref: REF, assets });
}

async function importGitHubAsset(request: Request, env: WorkerEnv): Promise<Response> {
  if (!env.GITHUB_TOKEN) return json({ ok: false, error: "github_source_not_configured" }, 503);
  if (!env.R2_ASSETS) return json({ ok: false, error: "r2_unavailable" }, 503);
  const body = await readJson(request);
  const rawPath = body?.["path"];
  const path = typeof rawPath === "string" ? rawPath : "";
  if (!validGitHubPath(path)) return badRequest("github_path_not_allowed");
  const response = await fetch(githubUrl(path), { headers: githubHeaders(env.GITHUB_TOKEN) });
  if (!response.ok) return json({ ok: false, error: "github_asset_failed" }, 502);
  const payload = (await response.json()) as {
    content?: string;
    encoding?: string;
    sha?: string;
    size?: number;
  };
  if (!payload.content || payload.encoding !== "base64")
    return json({ ok: false, error: "github_asset_not_binary" }, 422);
  if ((payload.size ?? 0) > MAX_GITHUB_ASSET_BYTES) return badRequest("github_asset_too_large");
  const bytes = Uint8Array.from(atob(payload.content.replace(/\s/g, "")), (character) =>
    character.charCodeAt(0),
  );
  const sha = payload.sha ?? "unknown";
  const key = `github/${sha}/${path}`;
  await env.R2_ASSETS.put(key, bytes, {
    httpMetadata: { contentType: assetContentType(path) },
    customMetadata: { repository: REPOSITORY, ref: REF, sourcePath: path, blobSha: sha },
  });
  return json({
    ok: true,
    key,
    repository: REPOSITORY,
    ref: REF,
    path,
    blobSha: sha,
    bytes: bytes.byteLength,
  });
}

async function serveImportedAsset(request: Request, env: WorkerEnv): Promise<Response> {
  if (!env.R2_ASSETS) return json({ ok: false, error: "r2_unavailable" }, 503);
  const url = new URL(request.url);
  const sha = url.searchParams.get("sha");
  const path = url.searchParams.get("path");
  if (!sha || !path || !validGitHubPath(path) || !/^[a-f0-9]{7,64}$/i.test(sha))
    return badRequest("invalid_asset_reference");
  const object = await env.R2_ASSETS.get(`github/${sha}/${path}`);
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, {
    headers: {
      "content-type": object.httpMetadata?.contentType ?? assetContentType(path),
      "cache-control": "public, max-age=31536000, immutable",
      ...(object.httpEtag ? { etag: object.httpEtag } : {}),
    },
  });
}

export async function handleApiRequest(
  request: Request,
  env: WorkerEnv = {},
): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) return null;
  if (url.pathname === "/api/health" && request.method === "GET") {
    return json({
      ok: true,
      version: env.APP_VERSION ?? "development",
      storage: env.DB ? "d1" : "local-only",
      assets: env.R2_ASSETS ? "r2" : "local-only",
      privateApi: isAccessRequest(request) ? "access" : env.APP_API_TOKEN ? "token" : "blocked",
    });
  }
  if (!isAuthorized(request, env)) return unauthorized();
  try {
    if (url.pathname === "/api/projects" && request.method === "GET") return listProjects(env);
    if (url.pathname === "/api/projects" && request.method === "POST") {
      const body = await readJson(request);
      const rawId = body?.["id"];
      const id = typeof rawId === "string" ? rawId : "";
      if (!validProjectId(id)) return badRequest("invalid_project_id");
      return saveSnapshot(request, env, id);
    }
    const projectMatch = url.pathname.match(/^\/api\/projects\/([^/]+)(?:\/snapshot)?$/);
    if (projectMatch) {
      const id = decodeURIComponent(projectMatch[1]!);
      if (!validProjectId(id)) return badRequest("invalid_project_id");
      if (url.pathname.endsWith("/snapshot") && request.method === "POST")
        return saveSnapshot(request, env, id);
      if (request.method === "GET") return getProject(env, id);
    }
    if (url.pathname === "/api/sources/github/tree" && request.method === "GET")
      return githubTree(env);
    if (url.pathname === "/api/sources/github/import" && request.method === "POST")
      return importGitHubAsset(request, env);
    if (url.pathname === "/api/assets/github" && request.method === "GET")
      return serveImportedAsset(request, env);
    return json({ ok: false, error: "not_found" }, 404);
  } catch (error) {
    console.error("[book-maker-api] request failed", error);
    return json({ ok: false, error: "internal_error" }, 500);
  }
}
