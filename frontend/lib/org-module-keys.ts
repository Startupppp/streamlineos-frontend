import { MANIFEST } from "./module-manifest";

const LEGACY_STORED_AS_PRODUCT_KEY = new Set(["accounting", "support"]);

const RETIRED_CANONICAL: Readonly<Record<string, string>> = {
  projects: "build",
};

export const ORG_MODULE_NAME: Readonly<Record<string, string>> = Object.fromEntries(
  MANIFEST.modules
    .filter((m) => m.productKey !== null && m.administrable)
    .map((m) => [m.id, m.id.toUpperCase()]),
);

const BUILD_ALIASES = ["BUILD", "PROJECTS"] as const;

const moduleAliasesMap: Record<string, readonly string[]> = {
  build: BUILD_ALIASES,
  projects: BUILD_ALIASES,
};

for (const m of MANIFEST.modules) {
  if (
    m.productKey !== null &&
    m.productKey !== m.id &&
    LEGACY_STORED_AS_PRODUCT_KEY.has(m.id)
  ) {
    const aliases: readonly string[] = [
      m.productKey.toUpperCase(),
      m.id.toUpperCase(),
    ];
    moduleAliasesMap[m.id] = aliases;
    moduleAliasesMap[m.productKey] = aliases;
  }
}

const MODULE_ALIASES: Readonly<Record<string, readonly string[]>> =
  moduleAliasesMap;

const canonicalMap: Record<string, string> = {};

for (const m of MANIFEST.modules) {
  canonicalMap[m.id] = m.id;
  if (m.productKey !== null && m.productKey !== m.id) {
    canonicalMap[m.productKey] = m.id;
  }
}

for (const [alias, canonical] of Object.entries(RETIRED_CANONICAL)) {
  canonicalMap[alias] = canonical;
}

const CANONICAL_MODULE_KEY: Readonly<Record<string, string>> = canonicalMap;

export function normalizeOrgModuleKey(moduleKeyOrName: string): string {
  const key = moduleKeyOrName.trim().toLowerCase();
  return CANONICAL_MODULE_KEY[key] ?? key;
}

export function orgModuleAliasesFor(
  moduleKeyOrName: string,
): readonly string[] {
  const key = moduleKeyOrName.toLowerCase();
  const aliased = MODULE_ALIASES[key];
  if (aliased) return aliased;
  const canonical = ORG_MODULE_NAME[key];
  return [canonical ?? moduleKeyOrName.toUpperCase()];
}

export function matchesOrgModule(
  enabledModules: string[],
  moduleKeyOrName: string,
): boolean {
  const enabled = enabledModules.map((entry) => entry.toUpperCase());
  return orgModuleAliasesFor(moduleKeyOrName).some((alias) =>
    enabled.includes(alias),
  );
}
