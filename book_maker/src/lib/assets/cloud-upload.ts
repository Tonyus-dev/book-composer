import type { Book, BookAsset } from "../../book/types";
import { getAssetBlob } from "./local-store";

export async function syncLocalAssets(book: Book, projectId: string): Promise<Book | null> {
  let changed = false;
  const assets: BookAsset[] = [];
  for (const asset of book.assets ?? []) {
    if (asset.storage?.kind !== "local") {
      assets.push(asset);
      continue;
    }
    const blob = await getAssetBlob(asset.storage.key);
    if (!blob) return null;
    let response: Response;
    try {
      response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(asset.id)}`,
        { method: "PUT", headers: { "content-type": asset.mime }, body: blob },
      );
    } catch {
      return null;
    }
    if (!response.ok) return null;
    const payload = (await response.json()) as { key?: unknown; url?: unknown };
    if (typeof payload.key !== "string" || typeof payload.url !== "string") return null;
    assets.push({
      ...asset,
      storage: { kind: "r2", key: payload.key, url: payload.url, localKey: asset.storage.key },
    });
    changed = true;
  }
  return changed ? { ...book, assets } : book;
}
