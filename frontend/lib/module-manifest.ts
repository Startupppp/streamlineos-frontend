import rawManifest from "./module-manifest.json";
import { moduleManifestSchema } from "./module-manifest-schema";
import type { ModuleEntry, ModuleManifest } from "./module-manifest-schema";

export type { ModuleEntry, ModuleManifest };
export type { ModuleLadder } from "./module-manifest-schema";

export const EXPECTED_MANIFEST_VERSION = 1;

export const MANIFEST: ModuleManifest = moduleManifestSchema.parse(rawManifest);

const byId = new Map<string, ModuleEntry>(
  MANIFEST.modules.map((m) => [m.id, m]),
);

const byProductKey = new Map<string, ModuleEntry>(
  MANIFEST.modules
    .filter((m): m is ModuleEntry & { productKey: string } => m.productKey !== null)
    .map((m) => [m.productKey, m]),
);

export function moduleById(id: string): ModuleEntry | undefined {
  return byId.get(id);
}

export function moduleByProductKey(key: string): ModuleEntry | undefined {
  return byProductKey.get(key);
}
