import type { Permission } from "./types";

export const CALENDAR_PERMISSIONS: Permission[] = [
  { name: "calendar:read", resource: "calendar", action: "read", description: "View calendar events" },
  { name: "calendar:write", resource: "calendar", action: "write", description: "Create and manage calendar events" },
];
