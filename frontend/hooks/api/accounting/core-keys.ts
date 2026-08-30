export const coreKeys = {
  all: ["streamlineos", "accounting", "core"] as const,
  coaTree: () => [...coreKeys.all, "coa-tree"] as const,
  coaTemplates: () => [...coreKeys.all, "coa-templates"] as const,
  setupStatus: () => [...coreKeys.all, "setup-status"] as const,
  gl: (params: object) => [...coreKeys.all, "gl", params] as const,
  glAccounts: (params: object) => [...coreKeys.all, "gl-accounts", params] as const,
  periods: () => [...coreKeys.all, "periods"] as const,
  period: (id: number) => [...coreKeys.all, "periods", id] as const,
  periodChecklist: (id: number) => [...coreKeys.all, "period-checklist", id] as const,
  openingBalance: () => [...coreKeys.all, "opening-balance"] as const,
  recurringJournals: (params: object) => [...coreKeys.all, "recurring-journals", params] as const,
};

export function toQuery<P extends object>(params: P): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = String(v);
  }
  return out;
}
