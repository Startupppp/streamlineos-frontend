import type {
  PermissionRequirement,
  ProductKey,
} from "@/components/layout/sidebar/sidebar-nav-types";

export interface BackendRouteRef {
  readonly method: "get" | "post" | "put" | "patch" | "delete";
  readonly path: string;
}

export interface RouteAccessExtension {
  readonly prefix: string;
  readonly exact?: boolean;
  readonly descendantsOnly?: boolean;
  readonly product?: ProductKey;
  readonly permission?: PermissionRequirement;
  readonly reason: string;
  // Set it and the suite asserts this operation's backend x-permission equals `permission`.
  readonly backendRoute?: BackendRouteRef;
}

export const ROUTE_ACCESS_EXTENSIONS: readonly RouteAccessExtension[] = [
  {
    prefix: "/billing/invoices",
    product: "finance",
    permission: "accounting:read",
    reason:
      "The organization's own customer invoicing is an Accounting surface even though the route sits under /billing. Navigation has no entry for it. The key is the one the page's own reads declare — GET /invoices, /invoices/stats and /invoices/:id are all accounting:read. It used to be accounting:receivables:read, which no role template grants and which gates only the finance AR endpoints (/accounting/ar-payments, /accounting/customer-statements), so the gate denied every non-owner including the ACCOUNTANT who holds every key this page calls.",
    backendRoute: { method: "get", path: "/invoices" },
  },
  {
    prefix: "/billing/invoices/new",
    exact: true,
    product: "finance",
    permission: "accounting:create",
    reason:
      "Raising an invoice is a create, not a read. The parent /billing/invoices gate is the read key, so without this entry the create surface inherited a read gate. Matches the backend gate on POST /invoices.",
    backendRoute: { method: "post", path: "/invoices" },
  },
  {
    prefix: "/portal",
    product: "build",
    permission: "build:portal:view",
    reason:
      "The client portal renders delivery work under project ids that navigation cannot enumerate.",
  },
  {
    prefix: "/ai/executive-brief",
    permission: "ai:executive-brief:view",
    reason:
      "Matches the backend gate on GET /ai/executive-brief. The surface has no navigation entry.",
    backendRoute: { method: "get", path: "/ai/executive-brief" },
  },
  {
    prefix: "/ask",
    permission: "kb:pages:view",
    reason:
      "Matches the backend gate on the KB ask endpoints. Knowledge Base reading is a member default, so this denies nobody who keeps platform core.",
    backendRoute: { method: "post", path: "/kb/ask" },
  },
  {
    prefix: "/blog/access",
    permission: "blog:access:view",
    reason:
      "Module access administration for Blog, which has no product navigation entry.",
  },
  {
    prefix: "/blog/admin",
    permission: "blog:posts:manage",
    reason:
      "Matches the backend gate on the /blog/admin/* endpoints. Authoring is administration, so it is gated on manage rather than on the public read key.",
    backendRoute: { method: "get", path: "/blog/admin/posts" },
  },
  {
    prefix: "/subjects",
    permission: "party:subjects:view",
    reason:
      "Business subjects surface reached from Party, with no navigation entry of its own.",
  },
  {
    prefix: "/notifications/providers",
    product: "administration",
    permission: "notifications:providers:view",
    reason: "Notification provider administration is not a universal communication read surface.",
  },
  {
    prefix: "/notifications/templates",
    product: "administration",
    permission: "notifications:templates:view",
    reason: "Notification template administration is not a universal communication read surface.",
  },
  {
    prefix: "/notifications/events",
    product: "administration",
    permission: "notifications:events:view",
    reason: "Notification event administration is not a universal communication read surface.",
  },
  {
    prefix: "/notifications/policy",
    product: "administration",
    permission: "notifications:policy:view",
    reason: "Notification policy administration is not a universal communication read surface.",
  },
  {
    prefix: "/notifications/broadcasts",
    product: "administration",
    permission: "notifications:broadcasts:view",
    reason: "Broadcast administration is not a universal communication read surface.",
  },
  {
    prefix: "/knowledge/wiki/import",
    product: "administration",
    permission: "kb:pages:import",
    reason: "Knowledge import is an administrative mutation surface.",
  },
  {
    prefix: "/knowledge/wiki/analytics",
    product: "administration",
    permission: "kb:analytics:view",
    reason: "Knowledge analytics are administrative reporting.",
  },
  {
    prefix: "/knowledge/wiki/reviews",
    product: "administration",
    permission: "kb:reviews:view",
    reason: "Knowledge reviews are an administrative workflow.",
  },
  {
    prefix: "/knowledge/wiki/spaces",
    exact: true,
    product: "administration",
    permission: "kb:spaces:view",
    reason: "Knowledge space management list is administrative. Individual space pages (/knowledge/wiki/spaces/[id]) are universal reading surfaces; only this listing is gated.",
  },
  {
    prefix: "/knowledge/wiki/templates",
    product: "administration",
    permission: "kb:templates:manage",
    reason: "Knowledge template management is administrative.",
  },
  {
    prefix: "/knowledge/wiki/trash",
    product: "administration",
    permission: "kb:pages:purge",
    reason: "Knowledge purge is an administrative destructive surface.",
  },
  {
    prefix: "/directory",
    descendantsOnly: true,
    permission: "directory:people:view",
    reason:
      "The people directory root is platform core for every active member (root §8), but an individual person's profile is a record read. Gating the descendants here keeps the root universal while leaving profile access decidable and fail-closed, which one navigation entry covering both could not express.",
  },
  {
    prefix: "/directory/access",
    permission: "directory:access:view",
    reason:
      "Directory access administration is governance, not the people directory. It carries its own key so the descendants rule above cannot lower it to directory:people:view.",
  },
  {
    prefix: "/directory/workers",
    permission: "directory:workers:view",
    reason:
      "Workforce administration records are not the people directory. Root §8 places workers under organization governance and excludes them from the universal directory surface.",
  },
  {
    prefix: "/chat/settings",
    product: "administration",
    permission: "chat:org-settings:manage",
    reason:
      "Organisation-wide chat configuration is administrative. Only org owners and admins hold chat:org-settings:manage; it is org-only and cannot be delegated.",
  },
  {
    prefix: "/build/workspaces/[pmWorkspaceId]/products",
    product: "build",
    permission: "build:managed-products:view",
    reason:
      "Workspace-scoped product list. Without a dynamic-segment entry the whole /build/workspaces/* tree collapses to the generic build:view, so a caller holding build:view but not build:managed-products:view would be hidden the sidebar link and still reach the URL.",
    backendRoute: { method: "get", path: "/build/managed-products" },
  },
  {
    prefix: "/build/workspaces/[pmWorkspaceId]/teams",
    product: "build",
    permission: "build:teams:view",
    reason:
      "Workspace-scoped team list carries the team read key, not the generic build:view the /build nav entry owns.",
    backendRoute: { method: "get", path: "/build/teams" },
  },
  {
    prefix: "/build/managed-products/[managedProductId]/projects",
    product: "build",
    permission: "build:view",
    reason:
      "Linked projects under a product read the project list, so the gate is the project read key rather than the build:managed-products:view the parent product route owns.",
    backendRoute: { method: "get", path: "/build" },
  },
  {
    prefix: "/build/customers",
    product: "build",
    permission: "build:customers:view",
    reason:
      "Delivery customers are a Build entity. Navigation resolved this route to crm:leads:view, a key from an unrelated module, so a Build user without CRM was denied a Build surface and a CRM user without Build was let in.",
    backendRoute: { method: "get", path: "/build/customers" },
  },
  {
    prefix: "/support/kb",
    permission: "kb:articles:view",
    reason:
      "Helpdesk knowledge articles. Without this entry the prefix resolved to the /support nav gate (dashboard:support:view), an unrelated key from another module, while every read the page issues declares kb:articles:view.",
    backendRoute: { method: "get", path: "/kb/articles" },
  },
  {
    prefix: "/support/kb/research-briefs",
    permission: "kb:pages:view",
    reason:
      "Research briefs are Knowledge pages, not helpdesk articles. The list page already self-gated on kb:pages:view while its own [briefId] detail resolved to the Helpdesk gate by prefix, so a holder of kb:pages:view saw the list and was denied every row.",
    backendRoute: { method: "get", path: "/kb/research-briefs" },
  },
  {
    prefix: "/build/[projectId]/qa",
    product: "build",
    permission: "build:qa:view",
    reason:
      "Project-scoped QA. Without a dynamic-segment entry the whole /build/[projectId]/* tree collapsed to the generic build:view the /build nav entry owns, so the granular key the sidebar checks was never enforced on arrival.",
    backendRoute: { method: "get", path: "/build/{projectId}/test-cases" },
  },
  {
    prefix: "/build/[projectId]/bugs",
    product: "build",
    permission: "build:bugs:view",
    reason: "Project-scoped defect tracking carries its own read key, not the generic build:view.",
    backendRoute: { method: "get", path: "/build/{projectId}/bugs" },
  },
  {
    prefix: "/build/[projectId]/incidents",
    product: "build",
    permission: "build:incidents:view",
    reason: "Project-scoped incident records carry their own read key, not the generic build:view.",
    backendRoute: { method: "get", path: "/build/{projectId}/incidents" },
  },
  {
    prefix: "/build/[projectId]/change-requests",
    product: "build",
    permission: "build:changerequests:view",
    reason: "Project-scoped change requests carry their own read key, not the generic build:view.",
    backendRoute: { method: "get", path: "/build/{projectId}/change-requests" },
  },
  {
    prefix: "/build/[projectId]/approvals",
    product: "build",
    permission: "build:approvals:view",
    reason: "Project-scoped approval queues carry their own read key, not the generic build:view.",
    backendRoute: { method: "get", path: "/build/{projectId}/approvals" },
  },
  {
    prefix: "/build/[projectId]/forms",
    product: "build",
    permission: "build:forms:view",
    reason: "Project-scoped intake forms carry their own read key, not the generic build:view.",
    backendRoute: { method: "get", path: "/build/{projectId}/forms" },
  },
  {
    prefix: "/build/[projectId]/risks",
    product: "build",
    permission: "build:risks:view",
    reason: "Project-scoped risk register carries its own read key, not the generic build:view.",
    backendRoute: { method: "get", path: "/build/{projectId}/risks" },
  },
  {
    prefix: "/build/[projectId]/decisions",
    product: "build",
    permission: "build:decisions:view",
    reason: "Project-scoped decision log carries its own read key, not the generic build:view.",
    backendRoute: { method: "get", path: "/build/{projectId}/decisions" },
  },
  {
    prefix: "/build/[projectId]/meetings",
    product: "build",
    permission: "build:meetings:view",
    reason: "Project-scoped meeting records carry their own read key, not the generic build:view.",
    backendRoute: { method: "get", path: "/build/{projectId}/meetings" },
  },
  {
    prefix: "/build/[projectId]/sprints",
    product: "build",
    permission: "build:sprints:view",
    reason: "Project-scoped sprint planning carries its own read key, not the generic build:view.",
    backendRoute: { method: "get", path: "/build/{projectId}/sprints" },
  },
  {
    prefix: "/build/[projectId]/settings",
    product: "build",
    permission: "build:update",
    reason:
      "Project configuration is a mutation surface, so it takes the update key its own PATCH declares. It resolved to generic build:view, letting anyone who can read a project open its settings, while navigation implied the global settings:manage — the wrong scope, since §8 keeps module configuration under the module.",
    backendRoute: { method: "patch", path: "/build/{projectId}" },
  },
  {
    prefix: "/build/[projectId]/budget",
    product: "build",
    permission: "build:manage",
    reason: "Project budget is delivery administration, so it takes the manage key rather than any read key.",
    backendRoute: { method: "get", path: "/build/{projectId}/budget" },
  },
  {
    prefix: "/build/[projectId]/client-portal",
    product: "build",
    permission: "build:clientvisibility:manage",
    reason:
      "Controls what an external client sees of a project. It had no permission check anywhere in its render path — no server gate and no client useCan — while navigation already declared this key.",
    backendRoute: { method: "get", path: "/build/{projectId}/client-visibility" },
  },
  {
    prefix: "/build/[projectId]/feedbucket",
    product: "build",
    permission: "feedbucket:widgets:view",
    reason:
      "Feedbucket widget administration inside a project. The key is the one its own first read declares; the Feedbucket module toggle is enforced separately by the backend module guard.",
    backendRoute: { method: "get", path: "/feedbucket/widgets" },
  },
  {
    prefix: "/calendar/settings",
    product: "administration",
    permission: "calendar:admin:manage",
    reason:
      "Organisation-wide calendar configuration (source integrations, defaults) is administration, so it takes the admin key. calendar:write cannot gate it: that key sits in EMPLOYEE_SELF_SERVICE, which is merged before any role is read, so every active member holds it unrevokably.",
  },
];

function segmentsOf(value: string): string[] {
  return value.split("/").filter((segment) => segment.length > 0);
}

function isDynamicSegment(segment: string): boolean {
  return segment.startsWith("[") && segment.endsWith("]");
}

function prefixCovers(prefix: string[], path: string[]): boolean {
  if (path.length < prefix.length) return false;
  return prefix.every((segment, index) => {
    const actual = path[index];
    if (actual === undefined || actual.length === 0) return false;
    return isDynamicSegment(segment) ? true : segment === actual;
  });
}

function specificityOf(prefix: string[]): number {
  const literals = prefix.filter((segment) => !isDynamicSegment(segment)).length;
  return prefix.length * 1000 + literals;
}

export function routeAccessExtensionCovers(
  entry: RouteAccessExtension,
  pathname: string,
): boolean {
  const prefix = segmentsOf(entry.prefix);
  const path = segmentsOf(pathname);
  if (!prefixCovers(prefix, path)) return false;
  if (entry.exact) return path.length === prefix.length;
  if (entry.descendantsOnly) return path.length > prefix.length;
  return true;
}

export function matchRouteAccessExtension(
  pathname: string,
): RouteAccessExtension | null {
  const path = segmentsOf(pathname);
  let best: RouteAccessExtension | null = null;
  let bestScore = -1;
  for (const entry of ROUTE_ACCESS_EXTENSIONS) {
    const prefix = segmentsOf(entry.prefix);
    if (!routeAccessExtensionCovers(entry, pathname)) continue;
    const score = specificityOf(prefix);
    if (score > bestScore) {
      best = entry;
      bestScore = score;
    }
  }
  return best;
}
