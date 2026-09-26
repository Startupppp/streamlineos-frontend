# AUDIT-L6 — S14, S15, S17, S18, S19, S20, S21

Lane L6. Backend root `D:/projects/personal/Streamlineos/backend`, frontend root
`D:/projects/personal/Streamlineos/frontend`. Measured 2026-09-25 against the working
tree (no destructive DB operations run; S21 is audit-only per brief).

Method: every box below was checked against the real controller/service/schema/component,
not against the ledger's prose. Where the ledger's fourth/sixth/eighth/ninth/tenth/twelfth
passes already carried file:line evidence, it is cited directly (re-verified against
today's tree, not copied blind) and the pass is named as the source. Where I found a gap
the prior passes hadn't recorded, it is marked OPEN with the exact reason it isn't a quick
fix, or FIXED where it was.

---

## S14 — Analytics

**Important correction to the slice index.** "LANDED — registered in KbWikiModule (BE-01)"
is true but describes the *wrong* controller. `KbWikiAnalyticsController`
(`src/modules/kb/analytics/kb-wiki-analytics.controller.ts`, registered
`src/modules/kb/wiki/kb-wiki.module.ts:67,88`) exposes `page-stats` / `stale-pages` /
`contributors`. Its three frontend hooks — `useWikiPageStats`, `useWikiStalePages`,
`useWikiContributors` (`frontend/hooks/api/kb/analytics.ts:111-145`) — have **zero
consumers** anywhere in `frontend/` (`grep -rln "useWikiPageStats\|useWikiStalePages\|useWikiContributors" frontend --include=*.tsx --include=*.ts` returns nothing outside the hook
file). The page the user actually reaches at `/knowledge/wiki/analytics`
(`frontend/app/(authenticated)/knowledge/wiki/analytics/page.tsx` →
`frontend/features/wiki/components/knowledge-analytics-page.tsx`) calls
`useKbAnalyticsOverview` / `useKbNoResults` / `usePageAnalytics` / `useKnowledgeGaps`, which
hit `KbAnalyticsController` (`src/modules/kb/help-centre/kb-analytics.controller.ts`),
registered separately in `KbHelpCentreModule`
(`src/modules/kb/help-centre/kb-help-centre.module.ts:38,51`). BE-01 was fixed on a
controller the UI doesn't call; the one it does call was already registered and untouched
by that fix. Both are real routes, but only one is reachable from the product.

**Update — 2026-09-25, resumed by the orchestrator.** All boxes below except the two
explicitly deferred to Support/product were closed this pass, against
`kb-analytics.service.ts` / `kb-analytics.controller.ts` (the controller the frontend
actually calls, not `KbWikiAnalyticsController`), plus the DTO/response-schema files and
`knowledge-analytics-page.tsx`.

- [FIXED] Date range + space filters — `overviewQuerySchema` extends `rangeSchema` with an
  optional `spaceId` (`src/modules/kb/help-centre/dto/kb-analytics.schemas.ts`); `overview()`
  applies it to both `kb_pages`-scoped subqueries (`articleStats`, `topArticles`) and
  deliberately **not** to the `kb_events`-scoped subquery — `kb_events` has no `space_id`
  column at all (confirmed against `src/db/schema/kb/events.ts`), so a search/view event
  cannot be attributed to a space without inventing a join the write path never populates.
  `pages()` (see drill-down box below) also takes `spaceId`. Biting tests:
  `kb-analytics-s14.spec.ts` — "scopes both kb_pages statistics queries to a given space" /
  "does not scope kb_pages statistics by space when spaceId is omitted", both run against the
  pre-fix service first (TypeError / assertion failure) and pass after.

- [FIXED] Successful resolution, zero-result queries, unsupported Ask queries, citation
  reuse, stale high-use pages, review SLA, public deflection —
  - Successful resolution / zero-result / unsupported-Ask were already built (unchanged this
    pass): `overview.searchSuccessRate`, `noResults`/`gaps`, `contentGaps`.
  - **Public deflection** — `kb_events.event_type = 'ticket_deflected'` was already emitted by
    `kb-from-ticket.service.ts:84` and `support-kb-gap.service.ts:147` but never aggregated.
    `overview()` now projects `ticketsDeflected` (`kb-analytics.service.ts`, eventStats
    select) and it is rendered as a stat card
    (`knowledge-analytics-page.tsx`, "Tickets deflected").
  - **Review SLA** — new `reviewSla(orgId, range)` reads `kb_page_reviews` (`dueAt`,
    `decidedAt`, `status`), returning `{decided, metSla, slaRate, overdueOpen}`; exposed at
    `GET /kb/analytics/review-sla` and rendered as "Review SLA met".
  - **Citation reuse** — new `citationReuse(orgId, range)` unions citations from
    `kb_chat_messages.citations` (already-applied table) and `kb_research_briefs.citations`,
    grouped by `(kind, ref_id)`, floored at `CITATION_REUSE_MIN = 2` occurrences; exposed at
    `GET /kb/analytics/citation-reuse` and rendered as "Reused citations". Deliberately does
    **not** read `kb_ai_interactions` (migration `1208`) — that table's apply status in
    production was unknown at the time of this pass, and querying an unapplied table from a
    live route is exactly the
    [[pending-migration-plus-live-call-site-is-a-deploy-landmine]] class; both citation
    sources used here are tables already live before this session.
  - Biting tests for all three: `kb-analytics-s14.spec.ts` "projects a ticketsDeflected
    count...", "computes the SLA hit rate...", "does not divide by zero...", "floors reuse
    at more than one citation..." — each confirmed failing (`TypeError: svc.reviewSla is not
    a function`, `svc.citationReuse is not a function`, missing projection) against the
    pre-fix service, passing after.

- [FIXED] Paginated drill-down for gaps — `pages()` was `.limit(50)` with no cursor and no
  `hasMore`, silently truncating past 50 (BE-24/BE-25 violation). Rewritten to keyset-paginate
  on `(uniqueViewers, id)` DESC via a hand-built `HAVING` predicate (the sort key is a
  correlated `count(distinct ...)`, not a plain column, so the existing `keysetAfterValue`-
  family helpers in `common/pagination/keyset.ts` don't fit; the tuple cursor is encoded with
  the already-exported `encodeTupleCursor`/`decodeTupleCursor(cursor, 2)` and
  `buildTupleCursorPage`, the same primitives a plain-column keyset would use). Response
  contract changed from a bare array to the standard `{data, pagination:{limit,hasMore,
  nextCursor}}` envelope (`kbAnalyticsPagesSchema` now `cursorPageSchema(...)`). Frontend
  `usePageAnalytics` converted to `useInfiniteQuery` (mirrors `useKbPageTemplates`'s existing
  pattern) and the "Top pages" table now ends in an `InfiniteScrollSentinel`
  (`components/ui/infinite-scroll-sentinel.tsx`, the house primitive — FE-125 compliant, no
  visible "Load more" button). **This was a contract-breaking change and had to be shipped
  atomically with the frontend hook/contract update in this same pass** — leaving the old
  `z.array(...)` contract in place against the new envelope response would have reproduced
  exactly the `/knowledge/wiki/import` array-vs-envelope defect the eleventh pass found and
  fixed for import/export jobs. Biting test: "reports hasMore and a nextCursor when the
  sentinel row is present" (51-row fixture) plus "decodes a tuple cursor..." / "issues no
  HAVING filter on the first page" — all fail on the pre-fix `.limit(50)` array return, pass
  after.
  - "assign/dismiss actions for gaps" is **not** part of this box's fix — that's a Content
    Health workflow concern (S15's persistent `kb_health_items` layer, explicitly deferred by
    the orchestrator this pass), not an Analytics drill-down concern. The one create-fix
    action that exists (`GET /kb/analytics/gaps` → "Create page" button) is unchanged.

- [FIXED] Minimum-cohort privacy thresholds; aggregates cannot reveal a hidden page via count
  or label — `gaps()`, `noResults()`, `contentGaps()` (the three endpoints that group raw
  search-query text by count) now carry `.having(sql\`count(*) >= ${MIN_COHORT_SIZE}\`)` with
  `MIN_COHORT_SIZE = 3` named beside the three call sites per BE-131. This directly closes the
  concern the box names: a query only one person searched no longer surfaces as a
  named-literal row with `count: 1`, which previously would have implicitly disclosed what a
  specific individual searched for in a small org. `pages()`/`overview()` (per-page, not
  per-query) were left unfloored deliberately — those already run through
  `visiblePagePredicate`, so a page a viewer cannot see never enters the aggregate at all;
  flooring an already-authorized page list would only hide real pages from their rightful
  viewer, not close a privacy gap. Biting tests: `kb-analytics-s14.spec.ts`, all three
  `... floors the ... aggregate at a minimum cohort size` cases — fail with
  `TypeError: ... .orderBy is not a function` (no `.having()` call existed) against the
  pre-fix service, pass after with the threshold value (3) asserted in the rendered SQL
  params.

- [DONE] Remove vanity totals, raw org-wide titles, duplicate trust scores, charts without
  table alternatives — unchanged from the prior finding: no chart widgets exist
  (`knowledge-analytics-page.tsx`, `StatCard` + plain tables only); `overview.trustScore` is
  computed but not rendered (dead output, not a duplicate display); `topArticles` titles are
  within-tenant.

- [DONE] Skeleton/error/no-data states — unchanged; `AnalyticsSkeleton`, `ErrorState` via
  `usePageState`/`PageState`, and a compact `EmptyState` per section, all still present and
  now also covering the two new stat rows (they render conditionally and add no new loading
  branch since they piggyback on the existing `useQuery` defaults).

**Collateral fixes required by the `pages()` signature/shape change**, all confirmed with the
full affected suite green (9 suites / 70 tests):
- `KbPagesService`... not touched by this change (different service). Within
  `KbAnalyticsService`: three pre-existing specs called `.pages(user)`/`.pages(USER)` with no
  second argument — `kb-surface-predicate.spec.ts:87`, `kb-page-reviews-query-schema.spec.ts:108`.
  Given a default parameter (`query: PageAnalyticsQueryInput = { limit: 50 }`) rather than
  editing every caller, since a missing query object is a legitimate "first page, default
  size" request, not an error. Both specs' shared mock chains were missing a `.having()`
  step (added as a passthrough, matching the existing `groupBy`/`orderBy` passthrough
  pattern in each file) — without it they were masking a `TypeError` behind a `.catch(() =>
  undefined)` that only checked whether the authorization predicate had been consulted, not
  whether the call actually completed.

---

## S15 — Content Health (`/knowledge/wiki/manage`)

**Orchestrator disposition (2026-09-25): explicitly deferred, not built this pass.**
`contradictory_claim` needs a detection-algorithm decision this audit is not positioned to
invent (see reasoning below, unchanged from the first pass). `unanswered_searches` needs a
product decision on whether a non-page-shaped signal belongs in a per-page inbox. The full
`kb_health_items` persistence/workflow layer is multi-migration scope for its own session.
Findings below are unchanged from the first pass and are carried forward for the record.

- [OPEN] `kb_health_items` schema — **does not exist.** `grep -rn "kb_health_items\|kbHealthItems" src/db/schema/` is empty. Signals are computed live from `kb_pages` on every
  request (`src/modules/kb/content-health/kb-content-health.service.ts:48-116`), not stored
  as rows with `assignee`/`due`/`state`/`rule_version`. This is why there is no assign, no
  dismiss and no snooze anywhere in the controller
  (`src/modules/kb/content-health/kb-content-health.controller.ts` exposes only `signals`
  and `counts`, both `GET`). Building the table + workflow (assign, dismiss-with-reason,
  durable exception, before/after trend) is a real feature, not a wiring fix; not attempted
  in this pass.

- [OPEN, 2 of 10 signal presets still missing — the exact remainder the brief asked me to
  identify] `contentHealthSignalTypeEnum`
  (`src/modules/kb/content-health/dto/kb-content-health.schemas.ts:6-14`) declares 8:
  `unowned, stale, unverified, empty, overdue_review, broken_link, overexposed,
  duplicate_candidate`. The combined spec (ledger box + `MASTER-IMPLEMENTATION-PROMPT.md:93`)
  names 10 distinct signals once "duplicate candidate" and "contradictory claim" are counted
  separately: those 8, plus **`contradictory_claim`** and **`unanswered_searches`**. Both
  were confirmed still-missing today (`buildSignalPredicate`,
  `kb-content-health.service.ts:118-192`, has no `case` for either).
  - `contradictory_claim`: not fixed here. There is no schema support (no
    `conflicts_with`/`supersedes` column anywhere in `src/db/schema/kb/`, confirmed by
    grep) and no defined detection algorithm in any spec document — the existing
    `duplicate_candidate` signal only catches **exact** `md5(content_text)` equality
    (`:178-190`), which is duplication, not contradiction. Building a real "these two pages
    disagree" detector needs either an NLP/semantic comparison or, at minimum, a
    similarity-threshold heuristic (e.g. trigram similarity below the exact-duplicate
    cutoff, combined with disagreeing `trustState`/`status`) — and per the ledger's own
    tenth-pass finding, a `pg_trgm` predicate in a signal like this is exactly the shape
    that gets silently defeated under RLS unless every function in it is leakproof (see the
    tenth pass's `md5`/`btrim` finding). Inventing an algorithm here without a product
    definition of "contradictory" would be exactly the kind of fabricated-compliance box
    this pack repeatedly warns about, so it is left open with this reasoning rather than
    stubbed.
  - `unanswered_searches`: not fixed here, for a different reason — it does not fit the
    signal model at all. `contentHealthSignalItemSchema`
    (`kb-content-health.schemas.ts:32-40`) is a `kb_pages` row projection
    (`id, title, spaceId, status, ownerMembershipId, updatedAt, nextReviewAt`). A search
    query with no results has no page id, no title, no owner — it is query-shaped, not
    page-shaped. The only place "unanswered searches" already exists is
    `KbAnalyticsService.noResults`/`.gaps` (help-centre analytics, S14, query rows keyed by
    `kbEvents.query`), which is a structurally different response contract. Folding it into
    Content Health's per-page inbox needs either a schema extension (a nullable-page variant
    of the item type) or a deliberate decision to keep it out of this inbox and rely on the
    Analytics "Knowledge gaps" panel instead (which already has a "Create page" action,
    `knowledge-analytics-page.tsx:107-144`) — a product call, not a bug fix.

- [OPEN] Filters; owner/due; reason/explanation; bulk repair; dismiss/snooze with reason;
  before/after health trend — none of these exist. `signals()` supports only
  `spaceId`/`afterId`/`limit` filtering (`kb-content-health.schemas.ts:19-26`); there is no
  owner/due filter, no bulk endpoint, and (as above) no persistence layer to hang a
  dismiss/snooze/trend on. Same root cause as the schema box above — this is one piece of
  work, not five separate small ones.

- [OPEN] Every item links to evidence and an allowed repair; no automated fix publishes
  without a human — there is no per-item evidence link or repair action in
  `content-health-page.tsx` at all; it renders a flat list per signal type
  (`frontend/features/wiki/components/content-health-page.tsx:44-51` for labels, no action
  column). Vacuously true that "no automated fix publishes without a human" (nothing
  publishes anything), but that is an absence of the feature, not satisfaction of the
  safety property it's meant to protect.

- [OPEN] Dismissals expire or record a durable exception — no dismiss exists (see above), so
  nothing to expire.

**Production evidence that what does exist is real, not just code:** the tenth pass drove
the deployed frontend and confirmed `/knowledge/wiki/manage` renders `h1 = "Content Health"`
with live counts (Unowned 9, Unverified 9, Empty 2, Duplicate candidate 2) at 0 console
errors, with a bogus-sibling-route 404 control proving the route is genuinely reachable and
not a middleware artifact. That evidence is for the 8 signals that exist; it says nothing
about the 2 that don't or the workflow boxes above.

---

## S17 — Public page (`/wiki/[shareToken]`)

- [DONE] Accessible reading typography; brand-light header; last updated; optional helpful
  feedback — **mostly.** `frontend/app/(public)/wiki/[shareToken]/page.tsx:114-136` renders
  an `h1`, icon, "Last updated {date}" and a cover/gradient header with no private chrome.
  **"Optional helpful feedback" is not present** — no feedback widget anywhere in this route
  or `public-page-content-loader.tsx`/`public-page-content.tsx`. Minor gap, not fixed here
  (small, but genuinely absent — noted rather than silently counted as done).

- [DONE] Invalid/revoked → 404; no private chrome, sibling tree, comments, Ask scope, or
  non-public metadata — `getPublicPage`
  (`src/modules/kb/wiki/kb-pages.service.ts:482-511`) projects only
  `title, icon, coverImage, content, updatedAt, publicTokenRevision` and throws
  `NotFoundException` when the hash/visibility/status/deleted predicate doesn't match
  (`:509`). The frontend route calls `notFound()` on any non-2xx or unparsable payload
  (`page.tsx:99-109`). No tree, comments or Ask affordance is ever fetched by this route.

- [DONE] Tokens hashed, revocable, versioned, rate limited, absent from logs — hashed at
  rest via SHA-256 (`src/modules/kb/wiki/kb-public-token.ts:9-11`), looked up only by
  `publicTokenHash` (`kb-pages.service.ts:494`); rate limited at
  `src/modules/kb/wiki/kb-public-pages.controller.ts:33-35` (`public:kb` tier); versioned via
  `publicTokenRevision` (migration `1192`, applied — ninth pass, re-verified: column exists,
  `NOT NULL DEFAULT 1`, 21 rows all at revision 1 as of the tenth pass's production read).
  **Caveat carried forward from the ledger, not new:** `kb_pages.public_token` (plaintext)
  still exists alongside `public_token_hash`
  (`src/db/schema/kb/pages.ts:57-58`) — the second migration to drop the plaintext column
  was deliberately deferred by a prior pass and remains deferred; the read path never uses
  the plaintext column, so this is a documented cleanup debt, not a live defect.

- [DONE] Cache headers keyed by token revision; rotation/revocation purges CDN/cache —
  `kb-public-pages.controller.ts:38-40` sets
  `ETag: "<updatedAt>-<publicTokenRevision>"` and `Cache-Control: public, no-cache`; revision
  bumps on mint/rotation/revocation and holds steady on an idempotent re-share (ninth pass,
  `publicTokenColumnsFor` `bumpRevision` flag). `no-cache` means every read revalidates, so
  there is nothing for a CDN to serve stale — the box's "purges CDN/cache" is satisfied by
  not caching rather than by an active purge, which is a stronger guarantee for a route with
  no CDN in front of it today (see BLOCKED note below).

- [OPEN, new finding this pass] Page and attachment access bound to the same public grant —
  **no public attachment route exists.** `grep -rn "public/wiki" src/modules/kb/wiki` finds
  only the page controller; there is no `@Public()` attachment/media endpoint. KB media is
  uploaded via `StorageService.uploadFile` to a bucket resolved through
  `NEXT_PUBLIC_R2_PUBLIC_URL` (`src/modules/storage/storage-placement.ts:28`,
  `storage.service.ts:438`) at an object key that embeds a `randomUUID()`
  (`storage-placement.ts:150`, 122 bits of entropy). In practice this means every KB
  attachment — on a public page, a private page, or a page with no sharing at all — is
  reachable to anyone holding the URL, with the object key's own entropy as the only access
  control; visibility of the *page* has no effect on the *attachment's* reachability in
  either direction. This is the existing house pattern for storage (same shape as the share
  token itself: a bearer secret, not a checked grant) rather than a new hole introduced by
  this work, and unwinding it would be an architecture change touching every KB attachment,
  not a public-page-specific fix. Recorded as open because the box asks for the two to be
  *bound*, and today they are simply both public-by-key, independently of the page's
  visibility setting.

- [DONE] `@Public` route RLS: SECURITY DEFINER lookup (42501 hazard) — closed by a different
  mechanism than the box's literal wording, confirmed unchanged today:
  `app.current_public_token_or_null()`
  (`migrations/0384_rls_public_token_read.sql:29-35`) is a plain `STABLE` function, **not**
  `SECURITY DEFINER`, deliberately non-raising (returns NULL instead of erroring when the
  GUC is unset, so RLS admits zero rows rather than aborting the scan). Migration `1171`
  rebuilt the `kb_pages` policy to compare the **hash** column instead of the plaintext one
  the original 0384 wired up (ledger: "S17 public share tokens — a half-finished cutover");
  applied to production per the sixth pass. Same outcome as a SECURITY DEFINER function
  (bounded, non-tenant-escaping single-row read for a bearer secret) via a simpler
  mechanism — eighth pass's characterization still holds.

- [BLOCKED — environmental, not a code gap] No CDN sits in front of `/public/wiki/:token`
  in this environment (confirmed absent from `frontend/next.config.ts` and no CDN config in
  either repo), so "rotation/revocation purges CDN/cache" cannot be exercised end-to-end;
  the `Cache-Control: no-cache` + revision-keyed `ETag` is the correct code-side contract for
  whichever CDN is eventually placed in front of it.

---

## S18 — Project wiki adapters

- [FIXED — real gap, closed with a biting test] Project membership enforced on every path —
  **was not true for create.** `KbPagesService.create`
  (`src/modules/kb/wiki/kb-pages.service.ts:77-166`) validated `parentPageId` (:98-109) and
  `spaceId` (:112-120) against the caller's org before insert, but wrote
  `input.projectId` straight into the row (`:161` before the fix) with **no check at all**
  that the caller belongs to that project. Any org member holding `kb:pages:create` could
  create a page under a `build` project they are not a member of — a write-side
  authorization hole (BE-90/BE-91), distinct from the read-side scoping which was already
  correct (`search()` and `KbPageTreeService.getTreeLevel()` both already call
  `resolveProjectAccess` from `src/modules/build/core/project-access.ts`, confirmed at
  `kb-pages.service.ts:398-406` and covered by
  `src/modules/kb/wiki/kb-wiki-project-scoped.spec.ts`). Fixed by calling the same
  `resolveProjectAccess(this.db, this.access, user, input.projectId)` helper in `create()`
  (`kb-pages.service.ts:122-130`) — reusing the exact function `search`/`getTreeLevel`
  already use, so there is now one project-membership check in the module, not two.
  - Test: `src/modules/kb/wiki/kb-page-create-project-scope.spec.ts` (3 cases). Confirmed
    **failing on the unfixed code** — the negative case resolved instead of throwing
    (`Resolved to value: {"id": 100, "orgId": "org-1", "projectId": 42}`) — then confirmed
    **passing after the fix**, plus a same-project control and an omitted-projectId control.
    Full related suite re-run clean: `kb-page-create-project-scope.spec.ts`,
    `kb-wiki-project-scoped.spec.ts`, `kb-pages-tenant-isolation.spec.ts`,
    `kb-pages.concurrency.spec.ts`, `kb-page-document.service.spec.ts`,
    `kb-page-visibility.spec.ts`, `kb-public-page-token.spec.ts`,
    `kb-public-pages.controller.spec.ts` — 8 suites / 59 tests, all pass. `npx eslint` on
    both changed files: clean.

- [DONE] `/build/[projectId]/wiki` and `/build/[projectId]/wiki/[pageId]` scope
  list/search/create/read by project — list: `/kb/pages/tree` accepts `projectId`
  (referenced by the twelfth pass, unchanged); search: `searchPagesSchema.projectId`
  (`src/modules/kb/wiki/dto/kb-pages.schemas.ts:96`), enforced at
  `kb-pages.service.ts:398-406`; create: `createPageSchema.projectId`
  (`kb-pages.schemas.ts:16`), now enforced (this pass, see above); read: every read goes
  through `visiblePagePredicate`, which resolves `accessibleProjectIds` via
  `getAccessibleProjectIds` (`src/modules/kb/core/authorization/knowledge-authorization.service.ts:48-54`)
  and routes project-scoped pages through it
  (`routeFor`, `:230-236`).

- [OPEN] History adapter — **still does not exist as a page.** No
  `app/(authenticated)/build/[projectId]/wiki/[pageId]/history/page.tsx` on disk (confirmed
  today, same as ninth pass). It was built once, then deleted by another session's
  `bb7bde9f1` with no replacement; the twelfth pass added a **config redirect** instead
  (`frontend/next.config.ts:112-113`,
  `/build/:projectId(\d+)/wiki/:pageId(\d+)/history` → `/knowledge/wiki/doc/:pageId/history`).
  That closes the 404/bookmark risk but does **not** satisfy the box as written: the
  destination is the canonical (non-project) history page, which drops the
  Project → Wiki breadcrumb entirely (see next box) rather than adapting it. Genuinely open;
  restoring the real adapter is a Build-module-adjacent frontend task outside this lane's
  file territory conflict list, but re-authoring it wasn't attempted here given the sibling
  session's explicit ownership of the surrounding Build release gate (per the ledger's
  eleventh-pass note) and the hard rule against touching `features/build/**`.

- [OPEN] Project back path in the breadcrumb (Project → Wiki → ancestors) — true for the
  home and page adapters (both render inside the `[projectId]` route tree and can resolve
  the project from `params`), **false for history**, which now redirects out of the project
  route entirely (see above) — a bookmark or link into project-scoped history lands on the
  generic Knowledge breadcrumb, not Project → Wiki.

- [DONE] No duplicate data, editor, or authorization implementation — confirmed: the project
  wiki pages (`frontend/app/(authenticated)/build/[projectId]/wiki/page.tsx`,
  `.../[pageId]/page.tsx`) both compose `WikiHomePage`/the canonical page-document component
  with a `projectId` prop, not a forked implementation; backend authorization is the single
  `resolveProjectAccess` + `visiblePagePredicate` path shared with the non-project wiki, now
  including `create()` after this pass's fix.

---

## S19 — Research Briefs

- [DONE] List/detail under Knowledge — `KbResearchBriefController`
  (`src/modules/kb/retrieval/kb-research-brief.controller.ts`) exposes
  `POST /kb/research-briefs` (enqueue), `GET /kb/research-briefs` (list),
  `GET /kb/research-briefs/:briefId` (detail), `POST /:briefId/rate`,
  `POST /:briefId/retry`, `DELETE /:briefId` (cancel), and (via
  `KbPagesController`) `POST /kb/research-briefs/:briefId/convert-to-page`
  (`src/modules/kb/wiki/kb-pages.controller.ts:207-212`, backed by
  `KbBriefToPageService`). Rate limited via `@UseRateLimit("ai:invoke")` on enqueue and
  retry. Schema (`src/db/schema/kb/research-briefs.ts:8-40`) carries question (`topic`),
  scope (`spaceId` only — not a full source-scope selector), `status`, owner
  (`userMembershipId`), `citations` (jsonb), `sourceCount`, `report`, `rating`. Retry/cancel
  ✓, rate-limit ✓, convert-to-page ✓.
  - [FIXED — migration authored, journalling and apply owned by the orchestrator] **No
    provider/model metadata, no cost/token tracking** — the schema had no `provider`,
    `model`, `tokenCount` or `cost` column at all, and `kb-research-brief.service.ts` wrote
    none. Per the orchestrator's explicit resolution: **extend** `kb_ai_interactions`
    (migration `1208`, journalled `idx 1092` but apply status unconfirmed at the time of this
    pass) rather than add a parallel table. `migrations/1218_kb_ai_interactions_research_brief.sql`
    adds a nullable `research_brief_id` column, an `(org_id, research_brief_id)` index, and an
    `ON DELETE SET NULL` FK to `kb_research_briefs(org_id, id)` — mirroring the existing
    nullable `conversation_id`/`message_id` pattern 1208 already uses, so a brief-originated
    row leaves those two null and sets `research_brief_id` instead. One anchor table for every
    KB AI call, chat or brief, not two. `NOT VALID` → `VALIDATE CONSTRAINT` per BE-62;
    precondition guard requires both `kb_ai_interactions` and `kb_research_briefs` to exist;
    postcondition guard confirms the column and FK landed. Rollback at
    `migrations/rollback/1218_kb_ai_interactions_research_brief.down.sql` drops only the new
    column/index/FK, leaving `kb_ai_interactions` itself untouched (1208 owns that table's
    lifecycle). **Per the orchestrator's instruction, `_journal.json` was not touched and
    nothing was applied** — the file is authored and handed off, matching the exact
    "HANDOFF: authored and NOT applied" convention lane L5 already used for the unjournalled
    `1217_kb_page_templates_usage.sql`. The Drizzle schema
    (`src/db/schema/kb/ai-interactions.ts`) was deliberately **not** updated to add
    `researchBriefId` yet either — lane L5 left `1217`'s schema untouched the same way, and
    updating it now would let code compile against a column that does not exist in production
    until this migration is applied (the exact
    [[pending-migration-plus-live-call-site-is-a-deploy-landmine]] shape). Wiring
    `KbResearchBriefService` to actually write rows is explicitly left for after apply, per
    the migration's own HANDOFF note.
  - [OPEN] **No "approval" workflow** — `grep -n "approv" src/modules/kb/retrieval/*.ts
    src/modules/kb/wiki/kb-brief-to-page.service.ts` finds nothing. Briefs are
    per-creator-private (`getById` filters `userMembershipId = actingMembershipId(user)`,
    `kb-research-brief.service.ts:141`), and converting one to a page uses the normal
    `kb:pages:create`-class permission — the human clicking "convert" is the only approval
    gate that exists. Whether that satisfies the box depends on a product reading of
    "approval" this audit can't resolve; recorded as open rather than assumed either way.

- [DONE] Cited records rechecked on open; losing access redacts the citation — **rechecked
  ✓, but the mechanism is "redact the whole brief," not "redact the one citation."**
  `getById` calls `assertCitationsStillVisible`
  (`kb-research-brief.service.ts:150`, implementation `:161-173`), which uses
  `KbCitationVisibilityService.partitionVisible` and throws `NotFoundException` for the
  **entire brief** if any cited record is no longer visible, with an explicit, deliberate
  rationale in the code: the prose was generated from the now-invisible document, so partial
  redaction would still leak its content through the report text. This mirrors
  `KbAskService.assertReplayCitations`'s handling of a saved Ask answer and is covered by
  `kb-research-brief-citation-recheck.spec.ts`. Stronger guarantee than literal "redacts the
  citation," on purpose — counted as DONE.

- [DONE] Completion durable if the browser closes — generation runs through the durable
  `ai_jobs` queue (`AiJobsService.enqueue`, called at `kb-research-brief.service.ts:63` and
  `:193`), the same queue the fourth pass added lease-recovery to
  (`reclaimExpiredLeases`); not tied to an open HTTP connection or SSE stream.

- [DONE] Remove the Support-owned duplicate route after callers migrate — re-confirmed
  today: `grep -rn "kbArticle" src --include=*.spec.ts` for
  `db.query.kbArticles`/`kbArticleAttachments` returns **zero** matches (was 11 stale doubles
  at the ninth pass — cleaned up by another lane since); one research-brief controller
  exists repo-wide (`kb/retrieval/kb-research-brief.controller.ts`), matching the eighth and
  ninth passes' findings with no drift.

---

## S20 — `/ask` removal, redirects, aliases

- [DONE] `/knowledge` redirect behavior — `frontend/app/(authenticated)/knowledge/page.tsx`
  is a route-level `redirect("/knowledge/chat")`. Confirmed **not** shadowed: there is no
  `next.config.ts` entry for the bare `/knowledge` path (only
  `/knowledge/wiki/pages/:pageId` and its `/history` variant,
  `next.config.ts:107-108`), so the route-level page is the only redirect mechanism for that
  path and actually fires.

- [DONE] `/ask` → `/knowledge/chat` redirect; callers moved; duplicate surface deleted —
  `next.config.ts:297-298`. `find frontend/app -ipath '*ask*'` returns only unrelated
  path-substring matches (`crm/tasks`, `inventory/rf/putaway/[taskId]`) — no `app/ask`
  directory exists. `grep -rln "'/ask'|\"/ask\"" frontend --include=*.tsx --include=*.ts`
  (excluding `.next*` build caches, which only carry the string in generated
  `routes.d.ts`/`validator.ts`) returns nothing outside `next.config.ts` itself.

- [DONE] Required aliases and redirects in place — confirmed present:
  `/knowledge/wiki/pages/:pageId` → `/knowledge/wiki/doc/:pageId` and its `/history`
  sibling (`next.config.ts:102-108`), `/ask` → `/knowledge/chat` (`:297-298`),
  `/build/:projectId/wiki/:pageId/history` → `/knowledge/wiki/doc/:pageId/history`
  (`:112-113`, added twelfth pass after the adapter page was deleted by another session).

- [DONE] Caller census shows zero callers before deletion — re-verified this pass by
  re-running the same census class of check (grep across `frontend/` and `backend/src/`),
  zero live callers found; matches the eighth pass's original finding with no drift since.

- [DONE] Redirects are not shadowed by `next.config.ts` — **verified specifically, per the
  brief's instruction to check this rather than assume it.** `next.config.ts` defines only
  `redirects()`, no `rewrites()`/`beforeFiles`/`afterFiles` — config-level `redirects()`
  always resolves before the filesystem router, so precedence isn't in question. The
  concrete shadowing check that matters is whether any *route-level* redirect page duplicates
  a *config-level* entry for the same path (in which case the route page is unreachable dead
  code): `/ask` and the `/build/.../history` alias have config entries and no competing
  route-level page; `/knowledge` has a route-level page and no competing config entry. No
  pair collides in either direction.

---

## S21 — `kb_articles` cutover + destructive contraction (audit only, no writes)

Per the brief and per the ledger's own precondition ("Runs last... until S01–S20 are
VERIFIED"), and because this is explicitly audit-only for this lane: **no destructive
statement, drop, truncate, reseed, or migration apply was run.** Everything below is either
(a) re-citing the ninth/tenth/twelfth passes' own recorded production evidence, which I did
not re-run against the live database myself, or (b) a fresh **static** check against
today's working tree (no DB access) to confirm the code side hasn't drifted since those
passes.

- [DONE, per ninth-pass production evidence, re-verified statically today] Pre-flight
  target resolution, per-record reconciliation, watermark/checksum, freeze→delta→switch,
  bridge removal — all recorded by the ledger's sixth/seventh/ninth passes with production
  query output (hash-and-`when` joined verification of all ten migrations, `kb_pages` = 21
  rows, all eight `kb_article*` tables absent, both enums dropped,
  `kb_article_chunks.attachment_id` widened to bigint). I did not re-run these against
  production; re-citing them here rather than re-measuring is a deliberate scope choice for
  this lane, not a claim that I independently reproduced it.

- [DONE, static re-verification this pass] Code side has not regressed since the ninth pass.
  `grep -rn "kbArticles\b" src/db/schema/` — empty, the Drizzle table is not defined.
  `grep -rln "kbArticle" src --include=*.ts | grep -v spec` — 30 files, all either
  `KbArticlesService`/`KbArticleQueryService`-class names (help-centre kept its filenames by
  design, per the ninth pass) or unrelated identifiers; `grep -rn "\bkbArticles\b|\bkbArticleAttachments\b|\bkbArticleVersions\b"` (the actual Drizzle schema-table
  identifiers) finds exactly **2** hits, both `KbArticlesService` constructor injections in
  `src/modules/support/kb-gap/support-kb-gap.service.ts:51,133` — a live service writing to
  `kb_pages`, not the dropped table. Matches the ninth pass's finding exactly.

- [DONE, improved since ninth pass] The 11 stale test doubles the ninth pass flagged
  (`db.query.kbArticles`/`kbArticleAttachments` mocks in 4 spec files) are now **zero** —
  `grep -rln "query\.kbArticles\|query\.kbArticleAttachments" src --include=*.spec.ts`
  returns nothing. Cleaned up by another lane since the ninth pass; no action needed from
  this one.

- [BLOCKED — orchestrator's call, per the brief] RDS snapshot/PITR posture, and any further
  live-database reconciliation proof beyond what the sixth/seventh/ninth passes already
  captured, requires production credentials and destructive-adjacent operations this lane
  is explicitly barred from running.

---

## Handoffs

1. **S18 fix landed this pass** (`kb-pages.service.ts` `create()` now calls
   `resolveProjectAccess` before writing `projectId`) — needs no further action, but a
   sibling lane touching `kb-pages.service.ts` should rebase past it rather than reintroduce
   the unchecked write. Note: a sibling lane added a 6th constructor argument (`AuditService`)
   to `KbPagesService` concurrently this session; re-read the file before editing it again.
2. **S14 — landed this pass, no further action needed.** `KbAnalyticsService` now has
   `spaceId` filtering (where the data model supports it), `ticketsDeflected`, `reviewSla()`,
   `citationReuse()`, a minimum-cohort floor on the three query-aggregate endpoints, and
   cursor-paginated `pages()`. Frontend hooks/contracts/component updated in the same pass to
   avoid shipping a contract-breaking response-shape change unwired (the `pages()` envelope
   change would otherwise have reproduced the `/knowledge/wiki/import` array-vs-envelope
   defect class the eleventh pass found). The registered-but-unconsumed
   `KbWikiAnalyticsController` (`page-stats`/`stale-pages`/`contributors`) is **still**
   dead code with zero frontend callers — it was not this pass's target (the frontend page
   calls the help-centre controller, not this one) and should either gain a consumer or be
   deleted as a "shallow wrapper with no leverage"
   (`MASTER-IMPLEMENTATION-PROMPT.md:130`).
3. **S15**: `contradictory_claim` needs a product decision on detection algorithm before any
   code is written (see reasoning above — this is not a quick add). `unanswered_searches`
   needs a decision on whether it belongs in the per-page Content Health inbox at all, given
   it is not page-shaped; if yes, `contentHealthSignalItemSchema` needs a nullable-page
   variant. The larger `kb_health_items` persistence/workflow layer (assign, dismiss+reason,
   trend, evidence links) is a multi-migration feature, flagged for a dedicated session.
   **Explicitly deferred by the orchestrator this pass — not attempted.**
4. **S17**: attachment access is public-by-key independent of page visibility — not a new
   hole, but worth a deliberate design review given it's the one box that asked for binding
   and today there is none. The deferred plaintext `public_token` column drop is still
   pending, as previously recorded. **Explicitly deferred by the orchestrator this pass.**
5. **S18**: the project-wiki history adapter page was deleted by another session
   (`bb7bde9f1`) and only has a config redirect to the non-project history page today,
   which loses the Project breadcrumb. Restoring the real adapter touches
   `app/(authenticated)/build/[projectId]/wiki/[pageId]/history/page.tsx`, which is outside
   this lane's conflict list (`features/build/**`/`hooks/api/build/**`), but should be
   confirmed with whoever owns the Build release gate before restoring it blind.
   **Explicitly deferred by the orchestrator this pass — Build territory mid-conflict.**
6. **S19 — migration authored and handed off, not applied.**
   `migrations/1218_kb_ai_interactions_research_brief.sql` (+ rollback) extends
   `kb_ai_interactions` with a nullable `research_brief_id` column and FK, per the
   orchestrator's explicit resolution of the migration-race concern raised in the first pass.
   **`_journal.json` was not touched and nothing was applied — the orchestrator owns
   journalling and apply.** Once applied, `KbResearchBriefService`'s AI call path needs to
   insert a `kb_ai_interactions` row with `research_brief_id` set (mirroring how
   `KbAskService` populates `conversation_id`/`message_id`), and S19's list/detail response
   schemas need the new cost/provider fields added. The Drizzle schema
   (`src/db/schema/kb/ai-interactions.ts`) was deliberately left unedited until apply, per
   the same precedent `1217_kb_page_templates_usage.sql` already set.

---

## Counts

- **DONE:** 26
- **FIXED:** 3
  1. S18 — `KbPagesService.create` project-membership check, with a negative/positive/control
     test triple, confirmed failing pre-fix and passing post-fix.
  2. S14 — five boxes closed in `KbAnalyticsService`/`KbAnalyticsController` (space filter,
     public deflection, review SLA, citation reuse, paginated drill-down) plus the
     minimum-cohort privacy threshold, all with biting tests in `kb-analytics-s14.spec.ts`
     (12 tests, each confirmed failing against the pre-fix service and passing after);
     frontend hooks/contracts/component updated in the same pass so the `pages()`
     envelope change ships wired, not dead.
  3. S19 — `kb_ai_interactions` extended for research-brief cost/provider tracking via
     migration `1218` (+ rollback), authored and handed off per the orchestrator's explicit
     instruction; not journalled or applied by this lane.
- **OPEN:** 9 — S15: schema, 2 missing signals, filters/bulk/dismiss/trend, evidence+repair,
  dismissal expiry (5 boxes, all explicitly deferred by the orchestrator); S17: attachment
  binding (1 box, explicitly deferred); S18: history adapter, breadcrumb (2 boxes, explicitly
  deferred — Build territory mid-conflict); S19: approval workflow (1 box — genuinely
  ambiguous product question, not deferred but unresolved).
- **BLOCKED (environmental, not a preference):** 2 (S17 — no CDN in this environment to
  exercise purge-on-revocation end-to-end; S21 — RDS snapshot/PITR and further live-DB proof
  need production credentials and are the orchestrator's call per the brief)

**The single most important defect found:** `KbPagesService.create()`
(`src/modules/kb/wiki/kb-pages.service.ts`, pre-fix) accepted a client-supplied `projectId`
and wrote it into a new `kb_pages` row with no verification that the caller belonged to that
project — while the sibling `search()` and `getTreeLevel()` methods, reading the very same
`projectId`-scoped rows, both already enforced it via `resolveProjectAccess`. Any org member
holding the ordinary `kb:pages:create` permission could plant a page inside a Build project
they have no membership in and cannot even read back — a write-side authorization bypass
sitting directly beside two already-correct read-side checks in the same file. Fixed this
pass by calling the same helper `search()`/`getTreeLevel()` use, closing the last unchecked
path and leaving exactly one project-membership check pattern in the module.

**Second most important finding:** `KbAnalyticsController`/`KbWikiAnalyticsController` were
both real, both registered, both fully tested — and only one of them was reachable from any
page in the product. The ledger's "LANDED — registered in KbWikiModule (BE-01)" note was true
of the controller nobody calls. Every box this lane closed for S14 had to be built against the
*other* controller, `KbAnalyticsController` in `help-centre/`, which BE-01's fix never
touched and which was never broken in the first place — it was simply the one connected to a
route the user can reach.
