import type { Permission } from "./types";

export const AUDIT_LOG_PERMISSIONS: Permission[] = [
  { name: "audit-log:read", resource: "audit-log", action: "read", description: "View the audit log" },
];
