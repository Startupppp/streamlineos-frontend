import type { Permission } from "./types";

export const TIMESHEETS_ACCESS_PERMISSIONS: Permission[] = [
  { name: "timesheets:access:view", resource: "timesheets:access", action: "view", description: "View timesheets module access" },
  { name: "timesheets:access:manage", resource: "timesheets:access", action: "manage", description: "Manage timesheets module access" },
];
