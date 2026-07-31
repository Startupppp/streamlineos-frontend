import type { Permission } from "./types";

export const REPORTS_PERMISSIONS: Permission[] = [
  { name: "reports:create", resource: "reports", action: "create", description: "Create reports" },
  { name: "reports:export", resource: "reports", action: "export", description: "Export reports" },
  { name: "reports:generate", resource: "reports", action: "generate", description: "Generate reports" },
  { name: "reports:schedule", resource: "reports", action: "schedule", description: "Schedule reports" },
  { name: "reports:view", resource: "reports", action: "view", description: "View reports" },
];
