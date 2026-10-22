
export type ModuleLadder = "delegable" | "universal" | "platform-admin";

export interface ModuleEntry {
  administrable: boolean;
  administersNamespaces: string[];
  cacheNamespaces: string[];
  displayName: string;
  id: string;
  ladder: ModuleLadder;
  moduleFolder: string | null;
  planGated: boolean;
  moduleKey: string | null;
  publicExposure: boolean;
  route: string | null;
  schemaFolder: string | null;
}

export interface ModuleManifest {
  modules: ModuleEntry[];
  version: number;
}

const MODULE_LADDERS: readonly ModuleLadder[] = [
  "delegable",
  "universal",
  "platform-admin",
];

export class ModuleManifestError extends Error {
  readonly path: string;

  constructor(path: string, expected: string) {
    super(`module manifest is invalid at ${path}: expected ${expected}`);
    this.name = "ModuleManifestError";
    this.path = path;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) throw new ModuleManifestError(path, "an object");
  return value;
}

function readBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") throw new ModuleManifestError(path, "a boolean");
  return value;
}

function readString(value: unknown, path: string): string {
  if (typeof value !== "string") throw new ModuleManifestError(path, "a string");
  return value;
}

function readNonEmptyString(value: unknown, path: string): string {
  const text = readString(value, path);
  if (text.length === 0)
    throw new ModuleManifestError(path, "a non-empty string");
  return text;
}

function readNullableString(value: unknown, path: string): string | null {
  if (value === null) return null;
  return readString(value, path);
}

function readStringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) throw new ModuleManifestError(path, "an array");
  return value.map((entry, index) => readString(entry, `${path}[${index}]`));
}

function readLadder(value: unknown, path: string): ModuleLadder {
  const text = readString(value, path);
  const ladder = MODULE_LADDERS.find((candidate) => candidate === text);
  if (ladder === undefined)
    throw new ModuleManifestError(path, MODULE_LADDERS.join(" | "));
  return ladder;
}

function readPositiveInteger(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0)
    throw new ModuleManifestError(path, "a positive integer");
  return value;
}

function readModuleEntry(value: unknown, path: string): ModuleEntry {
  const entry = readRecord(value, path);
  return {
    administrable: readBoolean(entry.administrable, `${path}.administrable`),
    administersNamespaces: readStringArray(
      entry.administersNamespaces,
      `${path}.administersNamespaces`,
    ),
    cacheNamespaces: readStringArray(
      entry.cacheNamespaces,
      `${path}.cacheNamespaces`,
    ),
    displayName: readString(entry.displayName, `${path}.displayName`),
    id: readNonEmptyString(entry.id, `${path}.id`),
    ladder: readLadder(entry.ladder, `${path}.ladder`),
    moduleFolder: readNullableString(
      entry.moduleFolder,
      `${path}.moduleFolder`,
    ),
    planGated: readBoolean(entry.planGated, `${path}.planGated`),
    moduleKey: readNullableString(entry.moduleKey, `${path}.moduleKey`),
    publicExposure: readBoolean(
      entry.publicExposure,
      `${path}.publicExposure`,
    ),
    route: readNullableString(entry.route, `${path}.route`),
    schemaFolder: readNullableString(
      entry.schemaFolder,
      `${path}.schemaFolder`,
    ),
  };
}

export function parseModuleManifest(value: unknown): ModuleManifest {
  const manifest = readRecord(value, "(root)");
  const rawModules = manifest.modules;
  if (!Array.isArray(rawModules))
    throw new ModuleManifestError("modules", "an array");
  if (rawModules.length === 0)
    throw new ModuleManifestError("modules", "at least one module");
  return {
    modules: rawModules.map((entry, index) =>
      readModuleEntry(entry, `modules[${index}]`),
    ),
    version: readPositiveInteger(manifest.version, "version"),
  };
}
