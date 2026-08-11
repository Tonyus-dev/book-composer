export interface GitHubSourceAsset {
  path: string;
  sha?: string;
  size: number | null;
  mime: string;
}

async function sourceRequest(path: string, init?: RequestInit): Promise<Response | null> {
  if (import.meta.env.DEV) return null;
  try {
    return await fetch(path, {
      ...init,
      headers: { accept: "application/json", ...init?.headers },
    });
  } catch {
    return null;
  }
}

export async function loadGitHubSourceAssets(): Promise<GitHubSourceAsset[] | null> {
  const response = await sourceRequest("/api/sources/github/tree");
  if (!response?.ok) return null;
  const payload = (await response.json()) as { assets?: GitHubSourceAsset[] };
  return Array.isArray(payload.assets) ? payload.assets : [];
}

export async function importGitHubSourceAsset(
  path: string,
  projectId: string,
): Promise<{ blobSha: string; path: string } | null> {
  const response = await sourceRequest("/api/sources/github/import", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ path, projectId }),
  });
  if (!response?.ok) return null;
  const payload = (await response.json()) as { blobSha?: unknown; path?: unknown };
  if (typeof payload.blobSha !== "string" || typeof payload.path !== "string") return null;
  return { blobSha: payload.blobSha, path: payload.path };
}

export function importedGitHubAssetUrl(blobSha: string, path: string): string {
  return `/api/assets/github?sha=${encodeURIComponent(blobSha)}&path=${encodeURIComponent(path)}`;
}
