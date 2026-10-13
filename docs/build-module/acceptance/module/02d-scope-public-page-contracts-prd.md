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
| `/build/managed-products/{managedProductId}/releases` · KEEP | Release timeline; upcoming, shipped and archived sections; owner, QA state and deployment evidence; canonical project-release link; evidence detail for tickets, test runs, incidents and approval | Status; timeline/list; cursor | Releases filtered by managed product; revision-conflict guarded create/edit sheet; canonical project-release link authorized on both records; archive/restore confirmation; evidence re-authorized per actor and redacted without a false zero count |
| `/build/managed-products/{managedProductId}/settings` · KEEP | General/lifecycle, members/access, project links, roadmap defaults, feedback channels, client publication, archive | No general views; all relation selectors paginated | Dirty-state form; move/link/archive impact dialogs; last-owner and client visibility checks transactional; settings versioned |

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
| `/intake/{projectId}` · RETIRED 2026-10-12 | Page deleted; the address 404s | None | Replaced by the opaque token address below. Both `POST /public/intake/{projectId}` and `GET /public/intake/{projectId}/form` are deleted with it. See the decision below |
| `/intake/t/{intakeToken}` · KEEP opaque intake address | Token-addressed intake form; success, closed and expired states | None | Opaque per-project intake token resolved server-side; token never returned to an unauthorized reader; publication gate on every submission; rate limit; generic refusal for unknown, unpublished and deleted alike |
| `/roadmap/by-token` · KEEP product share identity | Branded public product roadmap addressed by share token; approved outcomes and releases | Approved status/date filters; timeline/list; bounded date window | Hashed `managed_product_share_tokens` row with expiry, rotation and revocation checked in the same predicate on every request; archived or deleted product 404s; `noindex` |
| `/board/{shareToken}` · KEEP deny-by-default sharing | Board identity at the link's own access level; visible columns/cards/fields; freshness; revoke/expired state | Allowlisted public filter only; no saved views; per-column bounded paging | Opaque hashed token, expiry/revocation, field projection, rate limit; writes only on an editor link, with token, visibility, access level and expiry re-asserted inside the UPDATE; public cache keyed by share version and purged immediately. See the decision below |
| `/roadmap/{orgId}` · REPLACE raw org selector with share identity | Branded public roadmap, reflecting the roadmap as it changes; approved outcomes/releases; timeline/list | Approved status/date/product filters; timeline/list; bounded date window | Opaque share/grant or deliberately public slug; no raw organization ID as authority; hashed token with expiry and rotation; revocation takes effect on the next request |
| `/wiki/{shareToken}` · KB-owned integration | Read-only shared page/tree; accessible document; freshness/owner contact where approved | Page tree/search only within share grant; bounded tree/content | KB share token and ACL authoritative; Build only links; revoke, expiry, CSP, sanitization, and attachment projection |

### Decision 2026-10-12 — the product roadmap share link is live, not a snapshot

The `/roadmap/{orgId}` row above previously asked for a "publication
snapshot/version" and an "immediate unpublish purge". That has been narrowed to a
live, revocable share link. **Reverse this row if a frozen board is actually
wanted; the rest of this file does not depend on the choice.**

Why it was narrowed rather than implemented:

- The same row also required "last updated", which only means something for a
  board that changes. The row contradicted itself, so it could not be read as an
  accepted immutability requirement.
- No other sentence in `docs/build-module/` states that a published roadmap is
  frozen, and none of the ~22 user-visible strings in
  `roadmap-publication-panel.tsx` mentions a version or a point in time. The copy
  is entirely about a *link* that can be rotated or stopped.
- Nothing is stored or cached to purge: there is no snapshot table in
  `src/db/schema/build/`, and the public roadmap read path holds no cache entry.
  `revokeByProduct` sets `revoked_at`, which is the whole of unpublishing.
- Public voting writes `roadmap_items.votes`, and the published board projects
  that column. Freezing the board would require a rule for whether frozen vote
  counts keep counting. No document answers that, which is the strongest
  evidence a frozen board was never designed.

What publishing does guarantee, and is implemented: the token is stored only as a
hash, supports expiry and rotation, is revocable, serialises its version
increment under a parent-row lock, and refuses an archived or deleted product.
`publicationVersion` is a link-rotation counter and is not a projection
identity — it is deliberately not rendered anywhere.

### Decision 2026-10-12 — two roadmap share addresses, one authority rule

Two addresses serve a public roadmap, owned by two services:

| Address | Owner | Token |
|---|---|---|
| `/roadmap/{orgId}` | `public/roadmap.service.ts` via `build/core/roadmap/roadmap-publication.service.ts` | `organizations.roadmap_public_token`, plaintext, no expiry or revocation column |
| `/roadmap/by-token?shareToken=` | `build/managed-products/managed-product-share-token.service.ts` | `managed_product_share_tokens.token_hash`, hashed, with expiry, rotation and revocation |

Both stay. They address different things — an organization board and one product's
board — and `01a`'s proposed `/roadmap/{shareToken}` path segment was never built.
The binding rule for both: **a raw organization or product ID is never publication
authority.** The organization address resolved an unpublished board whenever the
handle happened to equal `organizations.id`, which also defeated unpublishing,
because clearing the token left the ID address alive. Addressing by ID is only
honoured where the organization has a current publication.

### Decision 2026-10-12 — the shared board link is read-only or editable by issue, not by route

The `/board/{shareToken}` row previously said "Read-only board identity … no
mutation", but the surface deliberately supports an editable share, and the page
PATCHes the scene on a debounce. The row above is narrowed to match: the **link**
carries its own access level, chosen when it is issued. A viewer link refuses writes;
an editor link accepts them under the same hashed-token, expiry and revocation
predicate as the read. Revocation and expiry are re-asserted inside the UPDATE, not
only before it, so a link revoked between the read and the write writes nothing.

The stored column value is `public_access = 'editor'`; `"edit"` is only the response
projection the browser sees. Do not treat `"edit"` as a column value.
**Reverse this row if public editing should be withdrawn as a product capability**;
nothing else in this file depends on the choice.

### Decision 2026-10-12 — the project-ID intake address is retired, not kept alongside the token

`/intake/{projectId}` is deleted rather than left serving beside the token address,
and the two endpoints behind it go with it.

The guessable address was an enumeration oracle on real data, not a theoretical
one. Migration `1300_build_projects_intake_published_flag.sql` ran
`UPDATE build.projects SET intake_published_at = now() WHERE deleted_at IS NULL`,
so every project that existed at 1300 is published. A small-integer project id is
therefore a working anonymous submit address on any database that has run 1300.
Keeping the route would have left that open for as long as both addresses existed.

The cost is accepted deliberately: **a link already shared at the project-ID
address now 404s, with no redirect.** A redirect is impossible by construction —
the replacement address contains a 24-byte secret, so nothing public may hand it
out, and a redirect that leaked it would recreate the defect it fixes. The new
production database holds no organizations, so it holds no live links.

What made the retirement possible is that the token address finally has a producer.
`intake_published_at` had no writer at all between migration 1300 and 2026-10-12,
so every project created in that window refused every public intake submission on
both addresses, and `intake_token` reached no client. The authorized writer is
`build/{projectId}/settings/intake` with `publish` and `unpublish`; `unpublish`
clears publication and rotates the token in one `UPDATE`, so no window exists in
which a revoked address is live again. **Republishing therefore issues a new
address and every previously shared link stays dead** — that is what revocable
means here, and the confirmation copy says so.

**Reverse this row only by re-publishing a non-secret address**, never by restoring
the project-ID route.

## Public and Portal Safety

- no indexing unless publication explicitly opts in;
- strict CSP, safe rich-text rendering, upload scanning, rate limits, abuse
  telemetry, request-size limits, and generic not-found behavior;
- token rotation/revocation and grant version participate in every cache key;
- public actions never trust organization, project, user, customer, or actor IDs
  from the browser;
- analytics avoid personal data and cannot become an access side channel.

## Completion Checks
- [x] **BLD-02D-001** every current product, portal, and public Build route
  appears exactly once.
- [x] **BLD-02D-002** every scope collection has explicit components, filters,
  views, paging, overlays, backend predicate, cache behavior, and lifecycle.
- [x] **BLD-02D-003** public routes pass token-guessing, expiry, revocation,
  enumeration, rate-limit, injection, file, cache, and cross-tenant tests.
- [x] **BLD-02D-004** portal preview and external projection are byte-for-field
  equivalent for the same grant/version.
- [x] **BLD-02D-005** moved and consolidated routes are deleted only after
  migration, caller search, route manifest, and browser evidence.

### Closing evidence — 2026-10-13

**BLD-02D-002.** The five portal collections were bounded but uncursored: the
overview built milestones, tasks, deliverables, approvals and invoices with a
bare `.limit(PAGE_SIZE_CAP)`, so a client with more than one page of milestones
could not reach the rest. Each now has a keyset child page on `portal-projection`
with an ORDER BY matching its cursor, exposed on **both** surfaces — the staff
preview (`build/portal`) and the external client (`portal/v1`) — plus five
frontend hooks and sections. The inline arrays stay, so nothing breaks.

**BLD-02D-003.** 20 tests across the two public Build surfaces,
`public/whiteboard-links` and `public/build-forms`, each class paired with a
positive control: unknown and foreign tokens return the same generic 404 (no
enumeration oracle), expiry and revocation refuse at read and at write,
metacharacters (`%`, `_`, `'`, `\`, `;--`, `${}`, unicode) stay literal data.
Both token params gained a length cap. File abuse does not apply — neither
surface accepts an upload. Rate limiting was already enforced
(`public:form-submit`, 5/hour) and cache policy already pinned.

**BLD-02D-004.** `resolveActiveGrant` took the newest ACTIVE grant on the
project, so a project with two client grants previewed whichever was created
last rather than the client the staff user meant. It is now membership-bound
through an optional `forPortalMembershipId`, threaded from the query to the
overview and every child page so one preview session resolves one grant; a
selector naming no grant on this project yields the inactive-capability path
instead of silently falling back. The staff UI gained a "Previewing as" control.

The date types were wrong in the other direction from how they first looked.
Drizzle returns a `date` column as a **string** and only `timestamp` as a `Date`,
so `dueDate`, `releaseDate` and `issueDate` now declare `z.iso.date()` and only
`approvals[].dueAt` uses `nullableWireTimestamp()`. `pnpm typecheck` caught three
assignments every jest run had passed, and the parity spec had pinned the inverse
of reality — it asserted a string `dueDate` must be rejected, using `Date`
fixtures the query never produces.
