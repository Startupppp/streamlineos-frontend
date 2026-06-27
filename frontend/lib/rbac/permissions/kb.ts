import type { Permission } from "./types";

export const KB_PERMISSIONS: Permission[] = [
  {
    name: "kb:spaces:view",
    resource: "kb:spaces",
    action: "view",
    description: "Browse knowledge base spaces the user has access to",
  },
  {
    name: "kb:spaces:manage",
    resource: "kb:spaces",
    action: "manage",
    description: "Create, edit, and manage spaces, members, and permissions",
  },
  {
    name: "kb:categories:manage",
    resource: "kb:categories",
    action: "manage",
    description: "Create, edit, move, and delete categories",
  },
  {
    name: "kb:articles:view",
    resource: "kb:articles",
    action: "view",
    description: "Read knowledge base articles",
  },
  {
    name: "kb:articles:create",
    resource: "kb:articles",
    action: "create",
    description: "Create knowledge base articles",
  },
  {
    name: "kb:articles:update",
    resource: "kb:articles",
    action: "update",
    description: "Edit knowledge base articles",
  },
  {
    name: "kb:articles:delete",
    resource: "kb:articles",
    action: "delete",
    description: "Delete or archive knowledge base articles",
  },
  {
    name: "kb:articles:manage",
    resource: "kb:articles",
    action: "manage",
    description: "Publish, verify, restrict, and restore articles",
  },
  {
    name: "kb:analytics:view",
    resource: "kb:analytics",
    action: "view",
    description: "View knowledge base analytics and content-health dashboards",
  },
  {
    name: "kb:ai:generate",
    resource: "kb:ai",
    action: "generate",
    description: "Use metered KB AI features (Ask AI, authoring, gap analysis)",
  },
];
