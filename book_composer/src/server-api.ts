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
  arrayBuffer(): Promise<ArrayBuffer>;
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
  OWNER_PASSWORD?: string;
  SESSION_SECRET?: string;
  APP_VERSION?: string;
  GIT_SHA?: string;
}

const REPOSITORY = "Tonyus-dev/kallistis_producao";
const REF = "main";
const MAX_SNAPSHOT_BYTES = 900_000;
const MAX_GITHUB_ASSET_BYTES = 20_000_000;
const MAX_LOCAL_ASSET_BYTES = 4 * 1024 * 1024;

function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

function unauthorized(): Response {
  return json({ ok: false, error: "authentication_required" }, 401, {
    "www-authenticate": "Cookie",
  });
}

const SESSION_COOKIE = "kallistis_owner_session";
const SESSION_SECONDS = 30 * 24 * 60 * 60;

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string): Uint8Array | null {
  try {
    const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

async function sha256(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  let difference = 0;
  for (let index = 0; index < left.byteLength; index += 1)
    difference |= left[index]! ^ right[index]!;
  return difference === 0;
}

async function signSession(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return base64Url(new Uint8Array(signature));
}

function cookieValue(request: Request): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  return match?.[1] ?? null;
}

async function hasOwnerSession(request: Request, secret: string | undefined): Promise<boolean> {
  if (!secret) return false;
  const raw = cookieValue(request);
  if (!raw) return false;
  const [encoded, signature] = raw.split(".");
  if (!encoded || !signature) return false;
  const payloadBytes = decodeBase64Url(encoded);
  const signatureBytes = decodeBase64Url(signature);
  if (!payloadBytes || !signatureBytes) return false;
  const expected = await signSession(encoded, secret);
  const expectedBytes = decodeBase64Url(expected);
  if (!expectedBytes || !equalBytes(signatureBytes, expectedBytes)) return false;
  try {
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as {
      owner?: unknown;
      expiresAt?: unknown;
    };
    return (
      payload.owner === true &&
      typeof payload.expiresAt === "number" &&
      payload.expiresAt > Date.now()
    );
  } catch {
    return false;
  }
}

async function createOwnerCookie(secret: string): Promise<string> {
  const now = Date.now();
  const payload = base64Url(
    new TextEncoder().encode(
      JSON.stringify({ owner: true, issuedAt: now, expiresAt: now + SESSION_SECONDS * 1000 }),
    ),
  );
  const signature = await signSession(payload, secret);
  return `${SESSION_COOKIE}=${payload}.${signature}; Max-Age=${SESSION_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Strict`;
}

function clearOwnerCookie(): string {
  return `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict`;
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

async function isAuthorized(request: Request, env: WorkerEnv): Promise<boolean> {
  return hasOwnerSession(request, env.SESSION_SECRET);
}

async function login(request: Request, env: WorkerEnv): Promise<Response> {
  if (!sameOrigin(request)) return json({ ok: false, error: "origin_not_allowed" }, 403);
  if (!env.OWNER_PASSWORD || !env.SESSION_SECRET)
    return json({ ok: false, error: "owner_auth_not_configured" }, 503);
  const body = await readJson(request);
  const password = body?.["password"];
  if (typeof password !== "string" || password.length === 0 || password.length > 4096)
    return unauthorized();
  const [actual, expected] = await Promise.all([sha256(password), sha256(env.OWNER_PASSWORD)]);
  if (!equalBytes(actual, expected)) return unauthorized();
  return json({ ok: true, authenticated: true }, 200, {
    "set-cookie": await createOwnerCookie(env.SESSION_SECRET),
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
    value.startsWith("assets/")
  );
}

function githubHeaders(token: string): HeadersInit {
  return {
    accept: "application/vnd.github+json",
    authorization: `Bearer ${token}`,
    "x-github-api-version": "2022-11-28",
    "user-agent": "book-composer",
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
    "SELECT revision, object_key, checksum, snapshot_json, created_at FROM project_revisions WHERE project_id = ?1 ORDER BY revision DESC LIMIT 1",
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
  if (snapshot === null && typeof revision?.["object_key"] === "string" && env.R2_ASSETS) {
    const object = await env.R2_ASSETS.get(revision["object_key"]);
    if (object) {
      try {
        snapshot = JSON.parse(await new Response(object.body).text());
      } catch {
        return json({ ok: false, error: "stored_snapshot_invalid" }, 500);
      }
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
  const objectKey = `projects/${id}/revisions/${revision}.json`;
  if (env.R2_ASSETS) {
    await env.R2_ASSETS.put(objectKey, new TextEncoder().encode(packed.json), {
      httpMetadata: { contentType: "application/json" },
      customMetadata: { projectId: id, revision: String(revision) },
    });
  }
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
      objectKey,
      checksum,
      env.R2_ASSETS ? null : packed.json,
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
  const rawProjectId = body?.["projectId"];
  const projectId =
    typeof rawProjectId === "string" && validProjectId(rawProjectId) ? rawProjectId : null;
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
  if (env.DB && projectId) {
    await env.DB.prepare(
      "INSERT OR REPLACE INTO assets (id, project_id, object_key, mime, bytes, width, height, source_type, source_metadata, created_at) VALUES (?1, ?2, ?3, ?4, ?5, NULL, NULL, ?6, ?7, ?8)",
    )
      .bind(
        `github:${sha}:${path}`,
        projectId,
        key,
        assetContentType(path),
        bytes.byteLength,
        "github",
        JSON.stringify({ repository: REPOSITORY, ref: REF, path, blobSha: sha }),
        new Date().toISOString(),
      )
      .run();
  }
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

async function uploadProjectAsset(
  request: Request,
  env: WorkerEnv,
  projectId: string,
  assetId: string,
) {
  if (!env.R2_ASSETS) return json({ ok: false, error: "r2_unavailable" }, 503);
  if (!validProjectId(assetId)) return badRequest("invalid_asset_id");
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (!bytes.byteLength || bytes.byteLength > MAX_LOCAL_ASSET_BYTES)
    return badRequest("asset_size_invalid");
  const mime = request.headers.get("content-type") || "application/octet-stream";
  if (!mime.startsWith("image/")) return badRequest("asset_mime_invalid");
  const key = `projects/${projectId}/assets/${assetId}`;
  await env.R2_ASSETS.put(key, bytes, {
    httpMetadata: { contentType: mime },
    customMetadata: { projectId, assetId },
  });
  return json({ ok: true, key, url: `/api/projects/${projectId}/assets/${assetId}` });
}

async function serveProjectAsset(env: WorkerEnv, projectId: string, assetId: string) {
  if (!env.R2_ASSETS) return new Response("Not found", { status: 404 });
  const object = await env.R2_ASSETS.get(`projects/${projectId}/assets/${assetId}`);
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, {
    headers: { "content-type": object.httpMetadata?.contentType ?? "application/octet-stream" },
  });
}

/**
 * Bridge entre o estado atual do editor e o pipeline de produção de PDF.
 *
 * Recebe o Book JSON que o editor acabou de salvar, escreve em /tmp,
 * dispara `scripts/export-pdf.mjs` (Playwright + pdfunite + Ghostscript)
 * e devolve o PDF binário. Disponível SOMENTE em ambiente Node — em
 * Cloudflare Workers retorna 503 para forçar o uso de `--in` em CI.
 *
 * Sem fallback silencioso: se o snapshot não chega, a exportação falha.
 */
async function exportFromSnapshot(request: Request): Promise<Response> {
  if (typeof globalThis.process?.versions?.node !== "string") {
    return json(
      {
        ok: false,
        error: "export_from_snapshot_dev_only",
        message:
          "Esta rota só está disponível em ambiente Node (vite dev). Em produção use `npm run export:pdf -- --in <arquivo>`.",
      },
      503,
    );
  }
  let body: Record<string, unknown> | null;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("invalid_json");
  }
  const book = body?.["book"];
  if (!book || typeof book !== "object" || !Array.isArray((book as { pages?: unknown }).pages)) {
    return badRequest("book_required");
  }
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const { spawn } = await import("node:child_process");

  const snapshotPath = path.join(
    "/tmp",
    `kallistis-snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`,
  );
  const outputPath = path.join(
    "/tmp",
    `kallistis-export-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pdf`,
  );
  await fs.writeFile(snapshotPath, JSON.stringify(book), "utf8");

  // Resolve o script relativo ao working directory (vite dev roda em book_composer/)
  const scriptPath = path.resolve(process.cwd(), "scripts", "export-pdf.mjs");
  const child = spawn("node", [scriptPath, "--in", snapshotPath, "--out", outputPath], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderrTail = "";
  child.stderr.on("data", (chunk) => {
    stderrTail += chunk.toString();
    if (stderrTail.length > 4096) stderrTail = stderrTail.slice(-4096);
  });
  const exitCode: number | null = await new Promise((resolve) => {
    child.on("exit", (code) => resolve(code));
    child.on("error", () => resolve(-1));
  });
  if (exitCode !== 0) {
    await fs.unlink(snapshotPath).catch(() => undefined);
    return json({ ok: false, error: "export_failed", exitCode, stderrTail }, 500);
  }
  let pdfBytes: Buffer;
  try {
    pdfBytes = await fs.readFile(outputPath);
  } catch (error) {
    await fs.unlink(snapshotPath).catch(() => undefined);
    return json({ ok: false, error: "pdf_not_found", message: String(error) }, 500);
  }
  // Cleanup tmp files (best-effort)
  await fs.unlink(snapshotPath).catch(() => undefined);
  await fs.unlink(outputPath).catch(() => undefined);

  const filename = `kallistis-${Date.now()}.pdf`;
  // Converte o Buffer do Node para Uint8Array aceito pelo construtor Response.
  // O cast é necessário porque o lib.dom.d.ts desta versão ainda não aceita
  // Uint8Array<ArrayBufferLike> diretamente em BodyInit.
  const pdfBody = new Uint8Array(pdfBytes.buffer, pdfBytes.byteOffset, pdfBytes.byteLength);
  return new Response(pdfBody as unknown as BodyInit, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}

export async function handleApiRequest(
  request: Request,
  env: WorkerEnv = {},
): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) return null;
  if (url.pathname === "/api/auth/login" && request.method === "POST") return login(request, env);
  if (url.pathname === "/api/auth/logout" && request.method === "POST") {
    if (!sameOrigin(request)) return json({ ok: false, error: "origin_not_allowed" }, 403);
    return json({ ok: true, authenticated: false }, 200, { "set-cookie": clearOwnerCookie() });
  }
  if (url.pathname === "/api/auth/session" && request.method === "GET") {
    return json({ ok: true, authenticated: await isAuthorized(request, env) });
  }
  if (url.pathname === "/api/export-from-snapshot" && request.method === "POST") {
    return exportFromSnapshot(request);
  }
  if (url.pathname === "/api/health" && request.method === "GET") {
    return json({
      ok: true,
      version: env.APP_VERSION ?? "development",
      gitSha: env.GIT_SHA ?? null,
      storage: env.DB ? "d1" : "local-only",
      assets: env.R2_ASSETS ? "r2" : "local-only",
      privateApi: env.OWNER_PASSWORD && env.SESSION_SECRET ? "owner" : "blocked",
    });
  }
  if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method) && !sameOrigin(request))
    return json({ ok: false, error: "origin_not_allowed" }, 403);
  if (!(await isAuthorized(request, env))) return unauthorized();
  try {
    if (url.pathname === "/api/projects" && request.method === "GET") return listProjects(env);
    if (url.pathname === "/api/projects" && request.method === "POST") {
      const body = await readJson(request);
      const rawId = body?.["id"];
      const id = typeof rawId === "string" ? rawId : "";
      if (!validProjectId(id)) return badRequest("invalid_project_id");
      return saveSnapshot(request, env, id);
    }
    const assetMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/assets\/([^/]+)$/);
    if (assetMatch) {
      const projectId = decodeURIComponent(assetMatch[1]!);
      const assetId = decodeURIComponent(assetMatch[2]!);
      if (!validProjectId(projectId)) return badRequest("invalid_project_id");
      if (request.method === "PUT") return uploadProjectAsset(request, env, projectId, assetId);
      if (request.method === "GET") return serveProjectAsset(env, projectId, assetId);
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
    console.error("[book-composer-api] request failed", error);
    return json({ ok: false, error: "internal_error" }, 500);
  }
}
