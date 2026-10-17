const MODULE_SCOPE_LABELS: Record<string, string> = {
  hr: "HR",
  crm: "CRM",
  build: "Build",
  inventory: "Inventory",
  accounting: "Accounting",
  payroll: "Payroll",
  timesheets: "Timesheets",
};

export function moduleScopeLabel(moduleKey: string): string {
  const known = MODULE_SCOPE_LABELS[moduleKey.toLowerCase()];
  if (known) return known;
  return moduleKey.charAt(0).toUpperCase() + moduleKey.slice(1);
}

export function moduleScopeExplanation(moduleKey: string): string {
  const label = moduleScopeLabel(moduleKey);
  return `Counts cover the ${label} module only. Organisation-wide roles and their full permission list live in Settings → Roles, so the two totals are not meant to match.`;
}
