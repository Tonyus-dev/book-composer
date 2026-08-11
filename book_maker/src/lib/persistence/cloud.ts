import type { Book } from "../../book/types";

export type CloudLoadResult =
  | { kind: "ok"; snapshot: Book | null; revision: number }
  | { kind: "unauthorized" }
  | { kind: "unavailable" };

export type CloudSaveResult =
  | { kind: "ok"; revision: number }
  | { kind: "unauthorized" }
  | { kind: "conflict"; currentRevision: number }
  | { kind: "unavailable" };

let authChecked = false;
let accessAvailable = false;

export function cloudProjectId(book: Pick<Book, "meta">): string {
  const title = book.meta.title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return title || "kallistis-book";
}

async function request(path: string, init?: RequestInit): Promise<Response | null> {
  // `bun run dev` is the local-first editor. The Worker emulator is exposed
  // through `bun run dev:cloud`, so do not generate noisy 401s in the regular
  // Vite browser session when no Access/token binding exists.
  if (import.meta.env.DEV) return null;
  if (!authChecked) {
    authChecked = true;
    try {
      const health = await fetch("/api/health", { headers: { accept: "application/json" } });
      const payload = (await health.json()) as { privateApi?: unknown };
      accessAvailable = payload.privateApi === "access";
    } catch {
      accessAvailable = false;
    }
  }
  if (!accessAvailable) return null;
  try {
    return await fetch(path, {
      ...init,
      headers: { accept: "application/json", ...init?.headers },
    });
  } catch {
    return null;
  }
}

export async function loadCloudProject(id: string): Promise<CloudLoadResult> {
  const response = await request(`/api/projects/${encodeURIComponent(id)}`);
  if (!response) return { kind: "unavailable" };
  if (response.status === 401) return { kind: "unauthorized" };
  if (!response.ok) return { kind: "unavailable" };
  try {
    const payload = (await response.json()) as {
      snapshot?: unknown;
      project?: { current_revision?: unknown };
      revision?: { revision?: unknown };
    };
    const revision = Number(payload.revision?.revision ?? payload.project?.current_revision ?? 0);
    return {
      kind: "ok",
      snapshot: (payload.snapshot as Book | null | undefined) ?? null,
      revision,
    };
  } catch {
    return { kind: "unavailable" };
  }
}

export async function saveCloudSnapshot(
  id: string,
  name: string,
  snapshot: Book,
  baseRevision: number | null,
): Promise<CloudSaveResult> {
  const response = await request(`/api/projects/${encodeURIComponent(id)}/snapshot`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id, name, snapshot, baseRevision }),
  });
  if (!response) return { kind: "unavailable" };
  if (response.status === 401) return { kind: "unauthorized" };
  if (response.status === 409) {
    try {
      const payload = (await response.json()) as { currentRevision?: unknown };
      return { kind: "conflict", currentRevision: Number(payload.currentRevision ?? 0) };
    } catch {
      return { kind: "conflict", currentRevision: 0 };
    }
  }
  if (!response.ok) return { kind: "unavailable" };
  try {
    const payload = (await response.json()) as { revision?: unknown };
    return { kind: "ok", revision: Number(payload.revision ?? 0) };
  } catch {
    return { kind: "unavailable" };
  }
}
