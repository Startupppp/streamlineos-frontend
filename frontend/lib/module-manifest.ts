import rawManifest from "./module-manifest.json";
import { parseModuleManifest } from "./module-manifest-schema";
import type { ModuleEntry, ModuleManifest } from "./module-manifest-schema";

export type { ModuleEntry, ModuleManifest };

export const EXPECTED_MANIFEST_VERSION = 1;

export const MANIFEST: ModuleManifest = parseModuleManifest(rawManifest);

const byId = new Map<string, ModuleEntry>(
  MANIFEST.modules.map((m) => [m.id, m]),
);

const byModuleKey = new Map<string, ModuleEntry>(
  MANIFEST.modules
    .filter((m): m is ModuleEntry & { moduleKey: string } => m.moduleKey !== null)
    .map((m) => [m.moduleKey, m]),
);

export function moduleById(id: string): ModuleEntry | undefined {
  return byId.get(id);
}

export function moduleByModuleKey(key: string): ModuleEntry | undefined {
  return byModuleKey.get(key);
}
