import type { Permission } from "./types";

export const TASKS_PERMISSIONS: Permission[] = [
  { name: "tasks:read", resource: "tasks", action: "read", description: "View tasks, sequences, analytics, and queue" },
  { name: "tasks:write", resource: "tasks", action: "write", description: "Create, update, delete, and complete tasks and sequences" },
];
