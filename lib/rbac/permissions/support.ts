import type { Permission } from "./types";

export const SUPPORT_PERMISSIONS: Permission[] = [
  {
    name: "support:kb:view",
    resource: "support:kb",
    action: "view",
    description: "View and browse knowledge base articles",
  },
  {
    name: "support:kb:manage",
    resource: "support:kb",
    action: "manage",
    description: "Create, edit, and publish knowledge base articles and categories",
  },
  {
    name: "support:macros:view",
    resource: "support:macros",
    action: "view",
    description: "View canned responses and ticket routing rules",
  },
  {
    name: "support:macros:manage",
    resource: "support:macros",
    action: "manage",
    description: "Create and edit canned responses and ticket routing rules",
  },
];
