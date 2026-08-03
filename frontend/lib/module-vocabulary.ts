export const ORG_MODULE_NAME: Readonly<Record<string, string>> = {
  hr: "HR",
  crm: "CRM",
  build: "BUILD",
  accounting: "FINANCE",
  inventory: "INVENTORY",
  support: "HELPDESK",
  kb: "KB",
  surveys: "SURVEYS",
  payroll: "PAYROLL",
  sign: "SIGN",
};

const BUILD_ALIASES = ["BUILD", "PROJECTS"] as const;

const MODULE_ALIASES: Readonly<Record<string, readonly string[]>> = {
  build: BUILD_ALIASES,
  projects: BUILD_ALIASES,
  accounting: ["FINANCE", "ACCOUNTING"],
  finance: ["FINANCE", "ACCOUNTING"],
  support: ["HELPDESK", "SUPPORT"],
  helpdesk: ["HELPDESK", "SUPPORT"],
};

/**
 * Canonical lowercase org module key for any accepted spelling: the key itself,
 * its UPPERCASE display name, or a retired name (`projects` → `build`).
 * The access snapshot is keyed by canonical keys, so every gate must normalize
 * before looking a module up — an unnormalized key silently reads as enabled.
 */
const CANONICAL_MODULE_KEY: Readonly<Record<string, string>> = {
  hr: "hr",
  hrms: "hr",
  crm: "crm",
  build: "build",
  projects: "build",
  accounting: "accounting",
  finance: "accounting",
  inventory: "inventory",
  kb: "kb",
  chat: "chat",
  support: "support",
  helpdesk: "support",
  surveys: "surveys",
  payroll: "payroll",
  sign: "sign",
};

export function normalizeOrgModuleKey(moduleKeyOrName: string): string {
  const key = moduleKeyOrName.trim().toLowerCase();
  return CANONICAL_MODULE_KEY[key] ?? key;
}

export function orgModuleAliasesFor(moduleKeyOrName: string): readonly string[] {
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
