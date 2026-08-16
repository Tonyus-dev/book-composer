export interface EditorialManifestAsset {
  id: string;
  src: string;
  path: string;
  hash?: string | null;
  sha256?: string | null;
  name: string;
  label: string;
  category: string;
  context: string[];
  status: string;
  alreadyUsedOccurrences: number;
  maxRepetitions: number;
  familyKey: string;
  allowedRoles: string[];
  reference?: string | null;
}

export interface EditorialAssetManifest {
  schemaVersion: 1;
  generatedAt: string;
  policy: {
    blockedStatuses: string[];
    fullPageRequiresExplicitAuthorization: boolean;
    defaultMaxRepetitions: number;
  };
  counts: { total: number; approved: number; pending: number; rejected: number };
  assets: EditorialManifestAsset[];
}

export async function loadEditorialAssetManifest(): Promise<EditorialAssetManifest | null> {
  try {
    const response = await fetch("/editorial-asset-manifest.json", { cache: "no-store" });
    if (!response.ok) return null;
    const value = (await response.json()) as EditorialAssetManifest;
    if (!value || value.schemaVersion !== 1 || !Array.isArray(value.assets)) return null;
    return value;
  } catch {
    return null;
  }
}
