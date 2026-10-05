import type { RouteAccessExtension } from "./route-access-extension-types";

const BUILD_PROJECT_VIEW_ROUTES: readonly string[] = [
  "/build/[projectId]",
  "/build/[projectId]/intake",
  "/build/[projectId]/milestones",
  "/build/[projectId]/modules",
  "/build/[projectId]/releases",
  "/build/[projectId]/reports",
  "/build/[projectId]/whiteboard",
];

function projectViewEntry(prefix: string): RouteAccessExtension {
  return {
    prefix,
    exact: true,
    product: "build",
    permission: "build:view",
    reason: "This existing project read page requires Build module and project access.",
  };
}

export const BUILD_PROJECT_VIEW_EXTENSIONS: readonly RouteAccessExtension[] = [
  ...BUILD_PROJECT_VIEW_ROUTES.map(projectViewEntry),
  {
    prefix: "/build/[projectId]/tickets/[ticketKey]",
    exact: true,
    product: "build",
    permission: "build:tickets:view",
    reason: "Ticket details read a project ticket by key and require the ticket read key.",
    backendRoute: { method: "get", path: "/build/{projectId}/tickets/key/{ticketNumber}" },
  },
  {
    prefix: "/build/[projectId]/wiki",
    exact: true,
    product: "build",
    permission: "kb:pages:view",
    reason: "The project Wiki index reads the Knowledge page tree after project access is checked.",
    backendRoute: { method: "get", path: "/kb/pages/tree" },
  },
  {
    prefix: "/build/[projectId]/wiki/[pageId]",
    exact: true,
    product: "build",
    permission: "kb:pages:view",
    reason: "A project Wiki document reads the Knowledge page detail after project access is checked.",
    backendRoute: { method: "get", path: "/kb/pages/{pageId}" },
  },
  {
    prefix: "/build/[projectId]/wiki/[pageId]/history",
    exact: true,
    product: "build",
    permission: "kb:pages:view",
    reason: "Project Wiki history reads Knowledge page versions after project access is checked.",
    backendRoute: { method: "get", path: "/kb/pages/{pageId}/versions" },
  },
  {
    prefix: "/build/[projectId]/chat",
    exact: true,
    product: "build",
    permission: "chat:channels:read",
    reason: "Project Chat uses the channel read key declared by its navigation and backend.",
    backendRoute: { method: "get", path: "/chat/channels/entity/{entityType}/{entityId}" },
  },
  {
    prefix: "/build/[projectId]/bugs/[submissionId]",
    exact: true,
    product: "build",
    permission: "build:view",
    reason: "Legacy bug-submission deep-link resolves a feedbucket submission to its intake item and redirects. Requires the same project read access as the intake index.",
    backendRoute: { method: "get", path: "/build/{projectId}/intake/by-feedbucket/{submissionId}" },
  },
];
