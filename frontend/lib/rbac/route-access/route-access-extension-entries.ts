import type { RouteAccessExtension } from "./route-access-extension-types";

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
    prefix: "/settings/notifications/providers",
    product: "administration",
    permission: "notifications:providers:view",
    reason: "Canonical settings route for notification provider administration. Mirrors /notifications/providers which remains as a compatibility redirect.",
  },
  {
    prefix: "/settings/notifications/templates",
    product: "administration",
    permission: "notifications:templates:view",
    reason: "Canonical settings route for notification template administration. Mirrors /notifications/templates which remains as a compatibility redirect.",
  },
  {
    prefix: "/settings/notifications/events",
    product: "administration",
    permission: "notifications:events:view",
    reason: "Canonical settings route for notification event administration. Mirrors /notifications/events which remains as a compatibility redirect.",
  },
  {
    prefix: "/settings/notifications/policy",
    product: "administration",
    permission: "notifications:policy:view",
    reason: "Canonical settings route for notification policy administration. Mirrors /notifications/policy which remains as a compatibility redirect.",
  },
  {
    prefix: "/settings/notifications/broadcasts",
    product: "administration",
    permission: "notifications:broadcasts:view",
    reason: "Canonical settings route for broadcast administration. Mirrors /notifications/broadcasts which remains as a compatibility redirect.",
  },
  {
    prefix: "/knowledge/wiki/search",
    permission: "kb:pages:view",
    reason:
      "Full-text page search. Matches the backend gate on GET /kb/pages/full-search (kb:pages:view). Navigation has an entry for it. The key is the one the page's own read declares.",
    backendRoute: { method: "get", path: "/kb/pages/full-search" },
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
    prefix: "/build/managed-products/[managedProductId]/projects",
    product: "build",
    permission: "build:view",
    reason:
      "Linked projects under a product read the project list, so the gate is the project read key rather than the build:managed-products:view the parent product route owns.",
    backendRoute: { method: "get", path: "/build" },
  },
  {
    prefix: "/support/kb",
    permission: "kb:articles:view",
    reason:
      "Helpdesk knowledge articles. Without this entry the prefix resolved to the /support nav gate (dashboard:support:view), an unrelated key from another module, while every read the page issues declares kb:articles:view.",
    backendRoute: { method: "get", path: "/kb/articles" },
  },
  {
    prefix: "/knowledge/research-briefs",
    permission: "kb:pages:view",
    reason:
      "Research briefs live under the Knowledge product. Without this entry the prefix resolves to the generic /knowledge gate, which carries no explicit permission and lets the layout guard alone; a holder of kb:pages:view who lacks an unrelated product-level key was denied.",
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
    prefix: "/build/[projectId]/cycles",
    product: "build",
    permission: "build:sprints:view",
    reason: "Cycles supersede sprints and share their iteration-planning read key; the generic build:view let a role without sprint access open cycle planning.",
    backendRoute: { method: "get", path: "/build/{projectId}/cycles" },
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
  {
    prefix: "/build/[projectId]/backlog",
    product: "build",
    permission: "build:tickets:view",
    reason:
      "Project backlog renders the same ticket dataset as the issues board. First read is GET /build/{projectId}/tickets, which requires build:tickets:view.",
    backendRoute: { method: "get", path: "/build/{projectId}/tickets" },
  },
  {
    prefix: "/build/[projectId]/epics",
    product: "build",
    permission: "build:tickets:view",
    reason:
      "Epics page calls useProjectBoardTickets, whose first read is GET /build/{projectId}/tickets requiring build:tickets:view.",
    backendRoute: { method: "get", path: "/build/{projectId}/tickets" },
  },
  {
    prefix: "/build/[projectId]/triage",
    product: "build",
    permission: "build:tickets:view",
    reason:
      "Triage page calls useTickets, whose first read is GET /build/{projectId}/tickets requiring build:tickets:view.",
    backendRoute: { method: "get", path: "/build/{projectId}/tickets" },
  },
  {
    prefix: "/build/[projectId]/issues",
    product: "build",
    permission: "build:tickets:view",
    reason:
      "Project issues board moved from the project root to /issues as part of BSN-01-023. Without this entry the route inherits the parent project scope resolution which returns build:view, letting in callers who hold build:view but not build:tickets:view. First read is GET /build/{projectId}/tickets, which carries build:tickets:view.",
    backendRoute: { method: "get", path: "/build/{projectId}/tickets" },
  },
  {
    prefix: "/build/[projectId]/workload",
    product: "build",
    permission: "build:tickets:view",
    reason:
      "Project workload renders the project ticket dataset. First read is GET /build/{projectId}/tickets, which requires build:tickets:view.",
    backendRoute: { method: "get", path: "/build/{projectId}/tickets" },
  },
  {
    prefix: "/build/managed-products/[managedProductId]/roadmap",
    product: "build",
    permission: "build:roadmap:view",
    reason:
      "Product-scoped roadmap. Without this entry the route falls back to the managed-products permission, allowing callers who hold build:managed-products:view but not build:roadmap:view to reach the roadmap board. First read is GET /build/roadmap, which carries build:roadmap:view.",
    backendRoute: { method: "get", path: "/build/roadmap" },
  },
  {
    prefix: "/build/managed-products/[managedProductId]/goals",
    product: "build",
    permission: "build:goals:view",
    reason:
      "Product-scoped goals and OKRs. Without this entry the route falls back to the managed-products permission, allowing callers who hold build:managed-products:view but not build:goals:view to reach the goals board. First read is GET /goals, which carries build:goals:view.",
    backendRoute: { method: "get", path: "/goals" },
  },
  {
    prefix: "/build/managed-products/[managedProductId]/feedback",
    product: "build",
    permission: "feedbucket:submissions:view",
    reason:
      "Product-scoped feedback submission list. First read is GET /feedbucket/submissions?managedProductId=:id, which requires feedbucket:submissions:view. Without this entry the route inherits the parent managed-products gate (build:managed-products:view), letting callers who hold build:managed-products:view but not feedbucket:submissions:view reach the inbox.",
    backendRoute: { method: "get", path: "/feedbucket/submissions" },
  },
  {
    prefix: "/build/managed-products/[managedProductId]/insights",
    product: "build",
    permission: "build:managed-products:view",
    reason:
      "Product insights aggregates. First read is GET /build/managed-products/{managedProductId}/insights, which requires build:managed-products:view. The parent product route already carries this key; this entry keeps the nav key and route-access resolution in agreement for the parity gate.",
    backendRoute: { method: "get", path: "/build/managed-products/{managedProductId}/insights" },
  },
  {
    prefix: "/build/[projectId]/updates",
    product: "build",
    permission: "build:updates:view",
    reason:
      "Project updates feed. First read is GET /build/{projectId}/updates, which requires build:updates:view. Without this entry the route inherits the project gate (build:tickets:view), so a caller holding tickets but not updates would reach the feed and the nav key would disagree with the route key.",
    backendRoute: { method: "get", path: "/build/{projectId}/updates" },
  },
  {
    prefix: "/build/[projectId]/files",
    product: "build",
    permission: "build:files:view",
    reason:
      "Project file list. First read is GET /build/{projectId}/files, which requires build:files:view. Without this entry the route inherits the project gate (build:tickets:view), so a caller holding tickets but not files would reach the list and the nav key would disagree with the route key.",
    backendRoute: { method: "get", path: "/build/{projectId}/files" },
  },
];
