import { z } from "zod";

const BuildRouteManifestEntrySchema = z.union([
  z.object({
    route: z.string(),
    decision: z.literal("KEEP"),
    target: z.null(),
  }),
  z.object({
    route: z.string(),
    decision: z.enum(["CONSOLIDATE", "MOVE", "DELETE"]),
    target: z.string().min(1),
  }),
]);

type BuildRouteManifestEntry = z.infer<typeof BuildRouteManifestEntrySchema>;

type RouteDecision = BuildRouteManifestEntry["decision"];

const BUILD_ROUTE_MANIFEST: readonly BuildRouteManifestEntry[] = [
  { route: "/build", decision: "KEEP", target: null },
  { route: "/build/[projectId]", decision: "KEEP", target: null },
  {
    route: "/build/[projectId]/ai",
    decision: "CONSOLIDATE",
    target: "/build/command-center?projectId=[projectId]",
  },
  {
    route: "/build/[projectId]/analytics",
    decision: "CONSOLIDATE",
    target: "/build/[projectId]/reports?tab=overview",
  },
  { route: "/build/[projectId]/approvals", decision: "KEEP", target: null },
  { route: "/build/[projectId]/backlog", decision: "KEEP", target: null },
  { route: "/build/[projectId]/budget", decision: "KEEP", target: null },
  {
    route: "/build/[projectId]/bugs",
    decision: "CONSOLIDATE",
    target: "/build/[projectId]/issues?type=BUG",
  },
  { route: "/build/[projectId]/change-requests", decision: "KEEP", target: null },
  { route: "/build/[projectId]/chat", decision: "KEEP", target: null },
  { route: "/build/[projectId]/client-portal", decision: "KEEP", target: null },
  { route: "/build/[projectId]/cycles", decision: "KEEP", target: null },
  { route: "/build/[projectId]/cycles/[cycleId]", decision: "KEEP", target: null },
  { route: "/build/[projectId]/decisions", decision: "KEEP", target: null },
  { route: "/build/[projectId]/epics", decision: "KEEP", target: null },
  { route: "/build/[projectId]/feedbucket", decision: "KEEP", target: null },
  {
    route: "/build/[projectId]/feedbucket/[submissionId]",
    decision: "KEEP",
    target: null,
  },
  { route: "/build/[projectId]/files", decision: "KEEP", target: null },
  { route: "/build/[projectId]/forms", decision: "KEEP", target: null },
  { route: "/build/[projectId]/forms/[formId]", decision: "KEEP", target: null },
  { route: "/build/[projectId]/incidents", decision: "KEEP", target: null },
  {
    route: "/build/[projectId]/incidents/[incidentId]",
    decision: "KEEP",
    target: null,
  },
  {
    route: "/build/[projectId]/intake",
    decision: "CONSOLIDATE",
    target: "/build/[projectId]/forms",
  },
  { route: "/build/[projectId]/issues", decision: "KEEP", target: null },
  { route: "/build/[projectId]/meetings", decision: "KEEP", target: null },
  {
    route: "/build/[projectId]/meetings/[meetingId]",
    decision: "KEEP",
    target: null,
  },
  { route: "/build/[projectId]/milestones", decision: "KEEP", target: null },
  { route: "/build/[projectId]/modules", decision: "KEEP", target: null },
  { route: "/build/[projectId]/qa", decision: "KEEP", target: null },
  { route: "/build/[projectId]/qa/runs/[runId]", decision: "KEEP", target: null },
  { route: "/build/[projectId]/releases", decision: "KEEP", target: null },
  { route: "/build/[projectId]/reports", decision: "KEEP", target: null },
  { route: "/build/[projectId]/risks", decision: "KEEP", target: null },
  { route: "/build/[projectId]/settings", decision: "KEEP", target: null },
  { route: "/build/[projectId]/settings/automations", decision: "KEEP", target: null },
  {
    route: "/build/[projectId]/settings/integrations/webhooks",
    decision: "KEEP",
    target: null,
  },
  { route: "/build/[projectId]/settings/workflow", decision: "KEEP", target: null },
  { route: "/build/[projectId]/tickets/[ticketKey]", decision: "KEEP", target: null },
  {
    route: "/build/[projectId]/timeline",
    decision: "CONSOLIDATE",
    target: "/build/[projectId]/issues?layout=timeline",
  },
  { route: "/build/[projectId]/triage", decision: "KEEP", target: null },
  { route: "/build/[projectId]/updates", decision: "KEEP", target: null },
  {
    route: "/build/[projectId]/views",
    decision: "CONSOLIDATE",
    target: "/build/[projectId]/issues",
  },
  { route: "/build/[projectId]/whiteboard", decision: "KEEP", target: null },
  { route: "/build/[projectId]/wiki", decision: "KEEP", target: null },
  { route: "/build/[projectId]/wiki/[pageId]", decision: "KEEP", target: null },
  { route: "/build/[projectId]/workload", decision: "KEEP", target: null },
  { route: "/build/all-work", decision: "KEEP", target: null },
  { route: "/build/approvals", decision: "KEEP", target: null },
  { route: "/build/command-center", decision: "KEEP", target: null },
  { route: "/build/customers", decision: "DELETE", target: "/crm" },
  { route: "/build/goals", decision: "KEEP", target: null },
  { route: "/build/goals/[goalId]", decision: "KEEP", target: null },
  { route: "/build/inbox", decision: "KEEP", target: null },
  { route: "/build/managed-products", decision: "KEEP", target: null },
  {
    route: "/build/managed-products/[managedProductId]",
    decision: "KEEP",
    target: null,
  },
  {
    route: "/build/managed-products/[managedProductId]/feedback",
    decision: "KEEP",
    target: null,
  },
  {
    route: "/build/managed-products/[managedProductId]/goals",
    decision: "KEEP",
    target: null,
  },
  {
    route: "/build/managed-products/[managedProductId]/insights",
    decision: "KEEP",
    target: null,
  },
  {
    route: "/build/managed-products/[managedProductId]/projects",
    decision: "KEEP",
    target: null,
  },
  {
    route: "/build/managed-products/[managedProductId]/roadmap",
    decision: "KEEP",
    target: null,
  },
  { route: "/build/my-work", decision: "KEEP", target: null },
  { route: "/build/portfolios", decision: "KEEP", target: null },
  { route: "/build/portfolios/[portfolioId]", decision: "KEEP", target: null },
  { route: "/build/programs", decision: "KEEP", target: null },
  { route: "/build/roadmap", decision: "KEEP", target: null },
  { route: "/build/settings/access", decision: "KEEP", target: null },
  { route: "/build/settings/client-access", decision: "KEEP", target: null },
  { route: "/build/settings/integrations", decision: "KEEP", target: null },
  { route: "/build/teams", decision: "KEEP", target: null },
  { route: "/build/teams/[teamId]", decision: "KEEP", target: null },
  { route: "/build/templates", decision: "KEEP", target: null },
  { route: "/build/workspaces", decision: "KEEP", target: null },
  { route: "/build/workspaces/[pmWorkspaceId]", decision: "KEEP", target: null },
  {
    route: "/build/workspaces/[pmWorkspaceId]/all-work",
    decision: "KEEP",
    target: null,
  },
  {
    route: "/build/workspaces/[pmWorkspaceId]/goals",
    decision: "KEEP",
    target: null,
  },
  {
    route: "/build/workspaces/[pmWorkspaceId]/overview",
    decision: "KEEP",
    target: null,
  },
  {
    route: "/build/workspaces/[pmWorkspaceId]/products",
    decision: "KEEP",
    target: null,
  },
  {
    route: "/build/workspaces/[pmWorkspaceId]/roadmap",
    decision: "KEEP",
    target: null,
  },
  {
    route: "/build/workspaces/[pmWorkspaceId]/teams",
    decision: "KEEP",
    target: null,
  },
];

export { BUILD_ROUTE_MANIFEST, BuildRouteManifestEntrySchema };
export type { BuildRouteManifestEntry, RouteDecision };
