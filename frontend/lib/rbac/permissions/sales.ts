import type { Permission } from "./types";

export const SALES_PERMISSIONS: Permission[] = [
  { name: "sales:manage", resource: "sales", action: "manage", description: "Manage sales module" },
  { name: "sales:view", resource: "sales", action: "view", description: "View sales module" },
];
