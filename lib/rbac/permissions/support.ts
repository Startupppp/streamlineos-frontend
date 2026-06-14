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
];
