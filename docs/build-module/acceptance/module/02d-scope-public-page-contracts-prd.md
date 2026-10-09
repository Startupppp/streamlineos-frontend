# BLD-02D — Product and Public Page Contracts PRD

> Acceptance reference only. Dispatch and status live in
> [`Build execution`](../README.md); do not assign
> or tick a checkbox in this file directly.

## Purpose

This file completes the page-level UI and data contract for Managed Product,
external-client, and public Build surfaces present or required by the
2026-09-19 source tree. It inherits the state, discovery, validation,
authorization, performance, and accessibility contracts referenced by BLD-02C.

## PM Workspace Pages — Removed

PM Workspace is removed, not renamed (BLD-00 D01). The entire
`/build/workspaces/{pmWorkspaceId}*` page tree and `/build/pm-workspaces` are
deleted with no replacement page. Each job moves to an organization-scope
route already covered elsewhere in this PRD set: Projects at `/build`
(BLD-02C), All Work at `/build/all-work` (BLD-02A), My Work at
`/build/my-work` (BLD-02A), Goals at `/build/goals` (BLD-02A), Products at
`/build/managed-products` (below), Teams at `/build/teams` (BLD-02A), and
Overview at `/build/command-center` (BLD-02A). `next.config.ts` redirects
every deep link. There is no workspace settings page.

## Managed Product Pages

| Route · disposition | Components and actions | Filters, views, and paging | Backend, cache, schema, and confirmation |
|---|---|---|---|
| `/build/managed-products` · KEEP | Product table/grid; owner, lifecycle, health; projects; roadmap/goals/feedback/release summary | Search; owner, lifecycle, health, team, customer segment, linked-project state, archived; table/grid; server paging | Backend filtered directory with projected counts; create/edit sheet; archive/restore confirmations; exact list/overview invalidation |
| `/build/managed-products/{managedProductId}` · KEEP | Product header; outcome KPIs; roadmap/release preview; goal progress; feedback trends; linked projects; client progress preview | Time window and project/customer segment scope; no decorative layouts; bounded panels | Product detail authorization; grouped/bounded metrics; every aggregate source-linked; edit/settings actions; archive and publish confirmation |
| `/build/managed-products/{managedProductId}/projects` · KEEP | Linked-project table; contribution/progress; owner/health; release and goal links | Search; team/customer, owner, status, health, contribution state; table; server paging | Product-project relation authorized on both records; link/move sheet with compatibility preview; unlink confirmation; roll-up invalidation |
| `/build/managed-products/{managedProductId}/roadmap` · KEEP | Outcome hierarchy; timeline/board/table; evidence, goals, releases, dependencies, customer visibility | Owner, status, health, date, goal, release, customer segment/visibility, evidence state; timeline/board/table; date-window paging | Canonical roadmap endpoint filtered by managed product; create/edit sheet; reprioritize/move; publish/unpublish confirmation; public/client cache writer matrix |
| `/build/managed-products/{managedProductId}/goals` · KEEP | Goal tree/list; progress/health; key results; contribution links; check-in freshness | Owner, status, health, parent, timebox, linked project/roadmap item; tree/list/table; cursor | Goals owner filtered by product; create/link/check-in overlays; close/archive confirmation; no parallel Build goal storage |
| `/build/managed-products/{managedProductId}/feedback` · KEEP | Feedback queue/table; source/customer; theme/sentiment evidence; status/owner; linked roadmap/issue; preview panel | Search; source, customer, theme, sentiment, status, owner, date, linked/unlinked, duplicate; list/table; cursor | Feedback endpoint requires product filter and grant; merge dialog; link/create-ticket sheet; archive/delete according source retention; row route includes owning project |
| `/build/managed-products/{managedProductId}/insights` · KEEP | KPI cards; trend charts with text summaries; themes; customer/source evidence; freshness and confidence | Date, source, segment, project, theme; chart + evidence table; evidence cursor | Server aggregates bounded and source-linked; AI inference labelled and human-verifiable; no cache across grants; export async |
| `/build/managed-products/{managedProductId}/settings` · ADD | General/lifecycle, members/access, project links, roadmap defaults, feedback channels, client publication, archive | No general views; all relation selectors paginated | Dirty-state form; move/link/archive impact dialogs; last-owner and client visibility checks transactional; settings versioned |

## Internal Portal Preview

| Route · disposition | Components and actions | Filters, views, and paging | Backend, cache, schema, and confirmation |
|---|---|---|---|
| `/portal` · KEEP internal preview directory | Employee-facing portal project directory; preview status, client grants, publication freshness, and open-preview action | Search permitted projects; published/draft/expired-grant filters; cards/list; server paging | Employee JWT plus `build:portal:view`; data comes from the same projection builder as external portal but uses employee authorization; no external token |
| `/portal/{projectId}` · KEEP internal preview detail | Exact client-facing dashboard inside an internal preview shell; visible grant/publication context and return to editor | Section navigation and only the filters supported externally; child cursors match external portal | Project access + portal-view permission; response field-for-field parity with a selected client grant; preview cannot mutate through external APIs |

## External Client Portal

| Route · disposition | Components and actions | Filters, views, and paging | Backend, cache, schema, and confirmation |
|---|---|---|---|
| `/client-portal` · KEEP | Branded external project directory; project health/update/milestone summary; grant expiry/support | Search permitted projects; active/archived where granted; cards/list; server paging | Portal JWT identity only; explicit grant query; no employee cache reuse; expired/revoked session returns safe state |
| `/client-portal/{projectId}` · KEEP | Approved health/update; milestones/releases; selected roadmap/work; files/meeting outcomes; change requests; feedback; freshness | Section navigation; date/status filters only on granted collections; cursor for updates/files/requests | One deny-by-default external projection; every nested read rechecks grant; change-request sheet and confirmation; cache keyed by portal actor/grant version |
| `/accept-invitation` · KEEP | Verifying, accepted redirect, missing/malformed, expired/used, retryable error, and support states | None; invitation token is consumed from the URL then removed by replace navigation | Single-use opaque token, expiry, intended recipient, project/grant scope, replay protection, rate limit, audit, safe generic errors; accepted portal token stored through the approved secure session mechanism |

Client pages never reveal internal costs, margins, private comments, hidden
people data, access policy, AI traces, audit details, unpublished roadmap, or
the existence/count of hidden records.

## Public Build Surfaces

| Route · disposition | Components and actions | Filters, views, and paging | Backend, abuse, cache, and confirmation |
|---|---|---|---|
| `/forms/{formToken}` · KEEP | Branded published form; accessible field renderer; progress for multi-section form; success/closed/expired states | No internal filters/views; conditional fields deterministic; options bounded/searchable | Opaque revocable token; publish-version schema; rate limit/bot/file controls; idempotent submit; no tenant metadata leakage; submit confirmation/reference |
| `/intake/{projectId}` · CONSOLIDATE into published Forms | Transitional minimal intake form with title/description and safe success state | None | Replace guessable project-ID exposure with opaque published form token; migrate requests/history before route deletion |
| `/board/{shareToken}` · KEEP deny-by-default sharing | Read-only board identity; visible columns/cards/fields; freshness; revoke/expired state | Allowlisted public filter only; no saved views; per-column bounded paging | Opaque hashed token, expiry/revocation, field projection, rate limit, no mutation; public cache keyed by share version and purged immediately |
| `/roadmap/{orgId}` · REPLACE raw org selector with share identity | Branded public roadmap; approved outcomes/releases; timeline/list; last updated | Approved status/date/product filters; timeline/list; bounded date window | Opaque share/grant or deliberately public slug; no raw organization ID as authority; publication snapshot/version; immediate unpublish purge |
| `/wiki/{shareToken}` · KB-owned integration | Read-only shared page/tree; accessible document; freshness/owner contact where approved | Page tree/search only within share grant; bounded tree/content | KB share token and ACL authoritative; Build only links; revoke, expiry, CSP, sanitization, and attachment projection |

## Public and Portal Safety

- no indexing unless publication explicitly opts in;
- strict CSP, safe rich-text rendering, upload scanning, rate limits, abuse
  telemetry, request-size limits, and generic not-found behavior;
- token rotation/revocation and grant version participate in every cache key;
- public actions never trust organization, project, user, customer, or actor IDs
  from the browser;
- analytics avoid personal data and cannot become an access side channel.

## Completion Checks

- [ ] **BLD-02D-001** every current product, portal, and public Build route
  appears exactly once.
- [ ] **BLD-02D-002** every scope collection has explicit components, filters,
  views, paging, overlays, backend predicate, cache behavior, and lifecycle.
- [ ] **BLD-02D-003** public routes pass token-guessing, expiry, revocation,
  enumeration, rate-limit, injection, file, cache, and cross-tenant tests.
- [ ] **BLD-02D-004** portal preview and external projection are byte-for-field
  equivalent for the same grant/version.
- [ ] **BLD-02D-005** moved and consolidated routes are deleted only after
  migration, caller search, route manifest, and browser evidence.
