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
