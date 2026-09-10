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
    prefix: "/knowledge/wiki/settings",
    product: "administration",
    permission: "kb:settings:manage",
    reason: "Knowledge settings are administrative, not universal reading.",
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
    prefix: "/calendar/settings",
    product: "administration",
    permission: "calendar:admin:manage",
    reason:
      "Organisation-wide calendar configuration (source integrations, defaults) is administration, so it takes the admin key. calendar:write cannot gate it: that key sits in EMPLOYEE_SELF_SERVICE, which is merged before any role is read, so every active member holds it unrevokably.",
  },
];

export function matchRouteAccessExtension(
  pathname: string,
): RouteAccessExtension | null {
  let best: RouteAccessExtension | null = null;
  for (const entry of ROUTE_ACCESS_EXTENSIONS) {
    const owns = entry.exact
      ? pathname === entry.prefix
      : pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`);
    if (!owns) continue;
    if (!best || entry.prefix.length > best.prefix.length) best = entry;
  }
  return best;
}
