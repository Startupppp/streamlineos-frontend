import type { Permission } from "./types";

export const BRANCH_PERMISSIONS: Permission[] = [
  { name: "branch:create", resource: "branch", action: "create", description: "Create branches" },
  { name: "branch:delete", resource: "branch", action: "delete", description: "Delete branches" },
  { name: "branch:update", resource: "branch", action: "update", description: "Update branches" },
  { name: "branch:view", resource: "branch", action: "view", description: "View branches" },
];
