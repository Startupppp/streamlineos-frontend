export const KNOWN_MODULES = [
  "build",
  "crm",
  "timesheets",
  "accounting",
  "invoices",
  "support",
  "kb",
  "hr",
] as const;

export type KnownModule = (typeof KNOWN_MODULES)[number];
