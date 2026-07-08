import type { Permission } from "./types";

export const FEEDBUCKET_PERMISSIONS: Permission[] = [
  {
    name: "feedbucket:widgets:view",
    resource: "feedbucket:widgets",
    action: "view",
    description: "View feedback widgets",
  },
  {
    name: "feedbucket:widgets:create",
    resource: "feedbucket:widgets",
    action: "create",
    description: "Create feedback widgets",
  },
  {
    name: "feedbucket:widgets:update",
    resource: "feedbucket:widgets",
    action: "update",
    description: "Update feedback widget settings",
  },
  {
    name: "feedbucket:widgets:delete",
    resource: "feedbucket:widgets",
    action: "delete",
    description: "Delete feedback widgets",
  },
  {
    name: "feedbucket:widgets:manage",
    resource: "feedbucket:widgets",
    action: "manage",
    description: "Rotate widget keys and manage advanced settings",
  },
  {
    name: "feedbucket:submissions:view",
    resource: "feedbucket:submissions",
    action: "view",
    description: "View feedback submissions in the inbox",
  },
  {
    name: "feedbucket:submissions:update",
    resource: "feedbucket:submissions",
    action: "update",
    description: "Update submission status, priority, and assignee",
  },
  {
    name: "feedbucket:submissions:delete",
    resource: "feedbucket:submissions",
    action: "delete",
    description: "Delete feedback submissions",
  },
  {
    name: "feedbucket:submissions:manage",
    resource: "feedbucket:submissions",
    action: "manage",
    description: "Convert submissions to tickets and perform all actions",
  },
  {
    name: "feedbucket:submissions:assign",
    resource: "feedbucket:submissions",
    action: "assign",
    description: "Assign feedback submissions to team members",
  },
];
