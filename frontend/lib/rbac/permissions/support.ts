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
  { name: "support:csat:manage", resource: "support:csat", action: "manage", description: "Create, update and delete CSAT surveys" },
  { name: "support:csat:view", resource: "support:csat", action: "view", description: "View CSAT surveys and responses" },
  { name: "support:portal:tickets:create", resource: "support:portal:tickets", action: "create", description: "Create support tickets via the customer portal" },
  { name: "support:portal:tickets:reply", resource: "support:portal:tickets", action: "reply", description: "Reply to own support tickets via the customer portal" },
  { name: "support:portal:tickets:view", resource: "support:portal:tickets", action: "view", description: "View own support tickets via the customer portal" },
  { name: "support:tickets:internal_note", resource: "support:tickets", action: "internal_note", description: "Post internal notes on support tickets" },
];
