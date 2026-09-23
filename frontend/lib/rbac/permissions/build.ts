import type { Permission } from "./types";

export const BUILD_PERMISSIONS: Permission[] = [
  { name: "build:create", resource: "projects", action: "create", description: "Create projects" },
  { name: "build:delete", resource: "projects", action: "delete", description: "Delete projects" },
  { name: "build:manage", resource: "projects", action: "manage", description: "Full project management (owner/admin: see and edit all projects)" },
  { name: "build:timesheets:manage", resource: "build:timesheets", action: "manage", description: "Manage all timesheets (owner/admin: see and edit everyone's)" },
  { name: "build:update", resource: "projects", action: "update", description: "Update projects" },
  { name: "build:view", resource: "projects", action: "view", description: "View projects" },
];
