# LEDGER-PATCH-L3 — S06, S07, S20

Lane L3. 21 open boxes, 21 verdicts: **16 SATISFIED, 3 DEFECT FIXED, 2 DECISION-REQUIRED.**

Every `file:line` below was opened and read in this pass. The prior-pass `AUDIT-L3.md` was treated as
leads only; two of its `DONE` verdicts did not survive re-measurement (S06 trust badges, S07 list view)
and one box it did not examine at all turned out to hold a real unbounded read (S06 acceptance).

Jest was run only with `--runTestsByPath`, `-w 2` or `-w 1`. No repo-wide gate, no git state command,
no migration, no database write.

---

### S06 — Wiki Home

- [x] Compact search field linked to full results — SATISFIED: `frontend/features/wiki/components/wiki-home-page.tsx:89`
- [x] URL-backed `status`, `spaceId`, owner, view controls — SATISFIED: `frontend/features/wiki/components/wiki-home-all-pages.tsx:294`
- [x] Card/list toggle, result count, cursor for All pages — SATISFIED: `frontend/features/wiki/components/wiki-home-all-pages.tsx:478`
- [x] Page-card menu via the single action descriptor model — SATISFIED: `frontend/features/wiki/lib/page-action-descriptors.ts:270`
- [ ] Trust badges (draft/published/archived, verified/stale, owner missing) — DEFECT FIXED: `frontend/features/wiki/components/kb-collection-badges.tsx:49` + `frontend/features/wiki/components/wiki-home-all-pages.tsx:110`; test `BITE: the list view flags a page whose owner membership is missing` in `frontend/features/wiki/components/wiki-home-all-pages.test.tsx:416`; bite-tested (failed before, passed after)
- [x] First-run path: blank, template, or import — SATISFIED: `frontend/features/wiki/components/wiki-home-all-pages.tsx:405`
- [x] Remove tree rendering for All pages; children load only on expand — SATISFIED: `frontend/features/wiki/components/wiki-home-all-pages.tsx:317` + `frontend/features/wiki/components/page-tree-item.tsx:90`
- [ ] Acceptance: responsive at 100,000 tenant pages without downloading the tree — DEFECT FIXED: `backend/src/modules/kb/wiki/kb-page-tree.service.ts:149`; test `BITE: the probe is a DISTINCT over the parent ids, so it cannot return one row per child page` in `backend/src/modules/kb/wiki/kb-page-tree-child-probe-bound.spec.ts:71`; bite-tested (failed before, passed after)

**Evidence:** Six boxes verified in source unchanged. **Box 5 was a real gap the prior audit missed:**
`wiki-home-all-pages.tsx` rendered the "Owner missing" badge only in the card grid, and `view` defaults
to `list` (`:303`), so at 1280px in the default view the third of the three required trust badges never
appeared. The badge is now one component, `OwnerMissingBadge` (`kb-collection-badges.tsx:49`), consumed
by the desktop table's Trust cell (`:110`) and the card (`:271`); the duplicated inline `<Badge>` and the
now-unused `Badge` import were deleted. jsdom renders the DataTable's mobile cards and its desktop table
simultaneously (only CSS hides one), so a naive `getByText` would have passed vacuously — the test
therefore captures the `columns` prop the component hands `DataTable` and renders the Trust cell in
isolation, paired with a positive control asserting an owned page gets `Verified` and no owner flag.
**Box 8 was never measured before and was false:** `getTreeLevel` computed `hasChildren` with a plain
`select({ parentPageId })` over *every* non-deleted child of the returned level
(`kb-page-tree.service.ts:147-163`). At 100k tenant pages under ~50 roots that transfers on the order of
100k rows to build a per-root boolean — precisely "downloading the tree to count", the thing the
acceptance forbids — and the wiki shell renders `PageTree` on Wiki Home itself
(`frontend/features/wiki/components/wiki-shell.tsx:116`), so it was live on the very surface the box
covers. The existing `kb-page-tree.acceptance.spec.ts` passed anyway because its mock returns an empty
first page, so `returnedIds.length === 0` and the probe never ran. Changed to `selectDistinct`, which
caps the result at one row per parent (≤ `limit + 1` ≤ 101) with the same `where` clause and identical
semantics. Three sibling specs needed a `selectDistinct` stub added
(`kb-page-tree.cursor-stability.spec.ts:65`, `kb-page-tree-tenant-isolation.spec.ts:91`,
`kb-wiki-project-scoped.spec.ts:47`); the tenant-isolation double routes the new probe's `where` into
the same collector, so its cross-tenant assertion still bites. Regression: all nine `kb-page-tree*`
suites plus `kb-wiki-project-scoped` green (45 + 8 tests). All reads on this surface are bounded by
`PAGE_SIZE_CAP = 100` (`backend/src/common/pagination/list-query.schema.ts:4`), the collection is a
keyset `limit + 1` read (`backend/src/modules/kb/core/collection/knowledge-collection.service.ts:179`),
and the tree level likewise (`kb-page-tree.service.ts:138`).

---

### S07 — Spaces + Space detail

- [x] Server-projected page/member counts — SATISFIED: `backend/src/modules/kb/wiki/kb-spaces.service.ts:194`
- [ ] Search, audience/status filters, cursor, list view — DEFECT FIXED: `frontend/features/wiki/components/spaces-list-table.tsx:208` + `frontend/features/wiki/components/spaces-page.tsx:333`; test `BITE: renders the spaces as a table when the URL asks for the list view` in `frontend/features/wiki/components/spaces-page.test.tsx:236`; bite-tested (failed before, passed after)
- [x] Members sheet; owner; last updated; manager health summary — SATISFIED: `frontend/features/wiki/components/space-card.tsx:104` + `frontend/features/wiki/components/spaces-page.tsx:422`
- [x] Archive/restore replacing customer-facing hard delete; restore idempotent — SATISFIED: `backend/src/modules/kb/wiki/kb-spaces.service.ts:448`
- [x] Archive impact preview: pages, public links, Ask index impact, record links — SATISFIED: `backend/src/modules/kb/wiki/kb-spaces.service.ts:467`
- [ ] Space detail: breadcrumb, audience/access badge, in-space search, status/owner filters, create-in-space, lazy hierarchy, review-policy summary, inaccessible vs not-found recovery — DECISION-REQUIRED (see below); 11 of 12 sub-items verified, the **access badge** alone is blocked
- [x] Every child request carries `spaceId`, tenant, parent/cursor, current access — SATISFIED: `frontend/hooks/api/kb/pages.ts:203` + `backend/src/modules/kb/wiki/kb-page-tree.service.ts:92`
- [x] Move checks both source and target space — SATISFIED: `backend/src/modules/kb/wiki/kb-page-tree.service.ts:328` (source) and `:374` (target)

**Evidence:** **Box 2 was the prior audit's second miss.** It recorded this box `DONE` citing search,
audience and status filters and the cursor — and silently dropped the fourth requirement. `SpacesPage`
rendered a `SpacesGrid` of cards and nothing else: no `view` URL param, no toggle, no table anywhere in
the file. Fixed with a URL-backed `view` (`spaces-page.tsx:78`, default `card` so the spec's "Keep:
cards" is honoured), a toggle pair carrying `aria-pressed` (`:300`, `:311`), and a new
`SpacesListTable` (`spaces-list-table.tsx`) columned on space, audience, pages, members, owner and
updated, with manage-gated row actions, cursor pagination via `DataTable`'s `pagination` prop and
`SpaceCard` as the sub-`sm` `mobileCard` — no second list primitive, no "Load more" (FE-125). Three
tests: two BITEs plus a control asserting the default is still the card grid, which passed before and
after. Full suite 17/17.
The **known live issue is resolved and I confirmed it in source, not in prose**: `SpaceMembersSheet` has
two real consumers today — `spaces-page.tsx:422` opened from the card's Members button
(`space-card.tsx:123`) and `space-detail-page.tsx:247` opened from the header button (`:138`) — and the
route behind it is registered *and reachable*: `GET /kb/spaces/:spaceId/members`
(`backend/src/modules/kb/wiki/kb-members.controller.ts:26`, `@RequirePermission("kb:spaces:manage")`),
registered at `backend/src/modules/kb/wiki/kb-wiki.module.ts:55`, called by `useKbSpaceMembers`
(`frontend/hooks/api/kb/spaces.ts:174`), whose `useCan("kb:spaces:manage")` gate matches the controller's
key exactly. No zero-consumer surface remains in this slice.
On box 4 I checked the inverse too: `useDeleteKbSpace` (`frontend/hooks/api/kb/spaces.ts:157`) has
**zero consumers** repo-wide, and `KbSpacesService.remove` is a soft delete
(`kb-spaces.service.ts:552` sets `deletedAt`), so there is no customer-facing hard delete to replace.
`restore()` sets `archivedAt: null` unconditionally with no precondition on current state, so a second
call is a no-op rather than an error — idempotent. `archiveImpact()` reports pages, `publicToken`-bearing
pages, `kbPageLinks` record links and Ask indexing measured from `kbSources.chunkCount > 0` — a real
chunk measurement, not `pageCount > 0`.
The owner filter the prior pass handed off has since landed in the shared table
(`frontend/features/wiki/components/wiki-page-collection-table.tsx:420`, hidden when the caller fixes
`owner` via props), which is what space detail renders, so that sub-item of box 6 is now satisfied.

**DECISION-REQUIRED — box 6, the per-viewer access badge.** Every other sub-item is verified:
breadcrumb `space-detail-page.tsx:162`, audience badge `:197`, in-space search + status/owner filters via
`WikiPageCollectionTable` (`:237` → `wiki-page-collection-table.tsx:401,409,420`), create-in-space `:134`,
lazy hierarchy `:233`, review-policy summary `:210`, not-found-vs-inaccessible recovery `:74`/`:179`.
The access badge cannot be implemented without a product decision, and the decision is **not** the one
the ledger records at line 975. That note says the mapping "cannot be defined until `kb_space_members.role`'s
two meanings are separated" — but they already are: `role` is a **text column holding role slugs**, used
as a group grant (`backend/src/modules/kb/core/authorization/knowledge-space-scope.ts` joins it with
`inArray(kbSpaceMembers.role, roleSlugs)`), while `spaceRole` is a separate three-value enum
(`backend/src/db/schema/kb/spaces.ts:58`, `viewer | editor | admin`, default `viewer`, not null). The
real blockers are two different questions:
1. **What access level does a viewer hold in a space they can reach but are not a member of?**
   `computeAccessibleSpaceIds` grants reach to every `public` and `mixed` audience space with no member
   row at all, and grants org admins every space. Those viewers have no `spaceRole` to render.
2. **How do three `spaceRole` values map onto the four labels the UI vocabulary already publishes?**
   `KB_ACCESS_LABELS` (`frontend/features/wiki/components/kb-collection-badges.tsx:20`) is
   `view | comment | edit | manage`. There is no source for `comment` and no defined image for `admin`.
   Inventing either mapping invents access semantics the product owner has not chosen.
A third, smaller consequence: `GET /kb/spaces/:spaceId` returns no viewer-scoped field at all today
(`kb-spaces.service.ts:331`), so whichever answer is chosen also needs an additive response field before
the badge can render. **Decide: (a) the non-member/admin default level, and (b) the
`spaceRole → KB_ACCESS_LABELS` mapping.** Implementation is ~1 backend field plus ~10 lines of UI once
both are fixed; nothing else in the box is open.

---

### S20 — `/ask` removal, redirects, aliases

- [ ] `/knowledge` redirect behavior verified with telemetry and entitlement — DECISION-REQUIRED (telemetry half; entitlement half verified — see below)
- [x] `/ask` → `/knowledge/chat` redirect; callers moved; duplicate surface deleted — SATISFIED: `frontend/next.config.ts:297`
- [x] Required aliases and redirects in place — SATISFIED: `frontend/next.config.ts:102` + `frontend/app/(authenticated)/kb/page.tsx:4`
- [x] Caller census (`rg` + dependency graph incl. dynamic imports and Nest module registration) shows zero callers before deletion — SATISFIED: `frontend/lib/rbac/route-access/__tests__/compatibility-redirects.test.ts:113`
- [x] Redirects are not shadowed by `next.config.ts` (config fires before route-level redirect pages) — SATISFIED: `frontend/lib/rbac/route-access/__tests__/route-redirect-shadowing.test.ts:73`

**Evidence:** The `/ask` surface is genuinely gone: no `ask` directory survives anywhere under
`frontend/app/`, and `/ask` is served only by the config redirect at `next.config.ts:297-300` →
`/knowledge/chat`, `permanent: false`. The caller census is clean — zero frontend callers post to a bare
`/ask` (every live call is namespaced `/kb/ask/...`, e.g. `frontend/hooks/api/kb/ask.ts:39`), zero nav
entries point at `/ask` (`sidebar-nav-groups-knowledge-support.ts:173` and
`features/wiki/components/wiki-sidebar-nav.tsx:82` both point at `/knowledge/chat`), and `/ask` is
deliberately absent from the route-access registry, which `compatibility-redirects.test.ts:113` pins.
The only surviving reference was documentation drift: `frontend/PAGES.md:97` still listed `/ask` as a
live AI page while every other retired route on that page carries a `[RETIRED — redirects to … via
next.config.ts]` annotation; corrected in this pass. Note the Nest-registration half of the census is a
false lead if read carelessly — `KbAskController`
(`backend/src/modules/kb/retrieval/kb-ask.controller.ts:75`, registered at
`kb-retrieval.module.ts:41`) is `@Controller("kb")` serving `POST /kb/ask`, the *live* Ask API that
`/knowledge/chat` consumes, not the deleted frontend surface.
Aliases verified in place: `/kb` → `/knowledge/wiki` (`app/(authenticated)/kb/page.tsx:4`), `/knowledge`
→ `/knowledge/chat` (`app/(authenticated)/knowledge/page.tsx:4`), `/knowledge/wiki/pages/:pageId` and
`…/history` → the `doc/` paths (`next.config.ts:102`, `:107`), and `/build/:projectId/wiki/:pageId/history`
→ `/knowledge/wiki/doc/:pageId/history` (`:112`). Every one of those config destinations has a real route
file; none of those config *sources* has one, so none is shadowing a live page.
**On shadowing I found the eighth pass's stated premise to be wrong while its conclusion held.**
Ledger line 1735 asserts "there is no route-level redirect page for `/ask`, `/knowledge` or `/wiki`" —
`app/(authenticated)/knowledge/page.tsx` is exactly such a page, and so is
`app/(authenticated)/kb/page.tsx`. They are not shadowed, because the config table declares no
`/knowledge` and no `/kb` source. But that held by accident and nothing pinned it: adding
`source: "/knowledge"` to `next.config.ts` would silently kill `knowledge/page.tsx` with every static
gate still green. Added `frontend/lib/rbac/route-access/__tests__/route-redirect-shadowing.test.ts`,
which walks `app/` for every `page.tsx` that calls `redirect()` from `next/navigation` (9 today),
derives each one's route path, and asserts none appears as a `source` in the config redirect table —
with a non-vacuity test proving the scan really finds `/knowledge` and `/kb` and a BITE proving the
comparison reports a synthetic shadowed pair. 4 tests, green; `compatibility-redirects.test.ts` still
29/29 alongside it.

**DECISION-REQUIRED — box 1, the telemetry half.** The entitlement half is satisfied and I read it:
`/knowledge` is universal in the route registry
(`frontend/lib/rbac/route-access/universal-routes.ts:73-84`), its layout enforces access before the
redirect runs (`app/(authenticated)/knowledge/layout.tsx:8`, `enforceRouteAccess("/knowledge")`), and the
destination is module-gated (`app/(authenticated)/knowledge/chat/page.tsx:8`,
`<RequireModule module="kb">`), so an org without the `kb` module lands on the 402 upgrade path rather
than a blank screen. The telemetry half **cannot be discharged by implementation**, because the product
has no route-level usage telemetry of any kind and the specs gate this box on some:
`06-code-removal-and-reuse.md:11` requires an "analytics comparison", `:107` requires "Production
telemetry shows zero legacy route/writer use for the agreed window". What exists instead:
- No analytics package is installed at all — no posthog/segment/mixpanel/amplitude/`@vercel/analytics`.
- The GTM and Clarity tags (`frontend/features/analytics/google-tag-manager.tsx:5`,
  `frontend/features/analytics/clarity.tsx:5`) return `null` unless an env var is set *and* it is a
  production build, and nothing anywhere pushes a `dataLayer` route-change event — in an App Router SPA
  they could not count client-side navigations even if enabled.
- Request paths *are* captured (`backend/src/common/http/correlation-id.middleware.ts:74`, `:81`) but the
  sink is stdout only, by design and by its own docstring
  (`backend/src/common/observability/log-span-exporter.ts:22-24`, "without a separate metrics
  database"), sampled in production, with `docs/EXTERNAL-DEPENDENCIES.md:74` recording the OTel collector
  as "Port built, nothing attached".
- `kb_page_visits` is content analytics, not route telemetry: keyed on knowledge page id, and *upserted*
  one row per (org, page, member), so it holds no time series to window.
**Decide one of:** (a) accept the static caller census plus the redirect tests as the evidence standard
for this box and strike "telemetry" from it — the census is genuinely exhaustive and `/ask` had already
been deleted before any window could have been observed, so no telemetry was ever going to exist for it;
(b) attach the existing span stream to a queryable sink (OTel collector or a log-analytics
destination), run the agreed window, then close the box on real data; or (c) build a durable route-hit
store — which is a new cross-cutting write on every request and collides with **BE-33** (no writes inside
a GET), so it needs an architecture decision, not a patch. **(a) is the only option that closes this box
in this programme's timeframe; (b) is the only one that satisfies it as written.** I did not choose.

---

## Findings outside my boxes, for whoever owns them

1. **`hasChildren` ignores the visibility predicate.** `kb-page-tree.service.ts:147-163` scopes the
   child-existence probe to org and `deletedAt` but not to `visiblePagePredicate`, so a tree node shows
   an expand chevron whose children the viewer cannot see, and expanding returns an empty level. It is a
   weak existence oracle over restricted pages, not a content leak. I left it alone deliberately: adding
   the predicate changes authorization behaviour and belongs to S01's seam, not to an S06 acceptance fix.
2. **`KbSpacesService.get` returns a raw ORM row** — `kb-spaces.service.ts:374` spreads `...space` into
   the response instead of an explicit projection (BE-07). Not in my boxes; flagging because the same
   method is where any access-badge field would land.
3. **`kb-page-tree.acceptance.spec.ts` is vacuous for the probe.** Both of its scale tests return an
   empty first page, so the branch that scaled with tenant size was never executed. It is now covered by
   `kb-page-tree-child-probe-bound.spec.ts`, but the older suite's name still overstates what it proves.
4. **Carried forward from the prior pass, still true:** two backend response fields added to
   `@ResponseSchema` (`ownerName`, `pagesOverdueForReview` on the space list item;
   `pagesOverdueForReview`, `pagesWithReviewPolicy` on the full space) have never been regenerated into
   the vendored OpenAPI contract. `openapi:gen` was not run in this pass either, per the hard rules —
   whoever runs the next full gate pass should regenerate it so `check:contract-vendor` and
   `check:contract-parity` can see those fields. I added no new response fields.

## Files changed by this lane

Source: `frontend/features/wiki/components/kb-collection-badges.tsx`,
`frontend/features/wiki/components/wiki-home-all-pages.tsx`,
`frontend/features/wiki/components/spaces-page.tsx`,
`frontend/features/wiki/components/spaces-list-table.tsx` (new),
`backend/src/modules/kb/wiki/kb-page-tree.service.ts` (one word: `select` → `selectDistinct`).
Tests: `frontend/features/wiki/components/wiki-home-all-pages.test.tsx`,
`frontend/features/wiki/components/spaces-page.test.tsx`,
`frontend/lib/rbac/route-access/__tests__/route-redirect-shadowing.test.ts` (new),
`backend/src/modules/kb/wiki/kb-page-tree-child-probe-bound.spec.ts` (new), plus `selectDistinct` stubs
in `kb-page-tree.cursor-stability.spec.ts`, `kb-page-tree-tenant-isolation.spec.ts`,
`kb-wiki-project-scoped.spec.ts`. Docs: `frontend/PAGES.md` (one line).

`npx eslint` on every touched file: 0 errors. One pre-existing `accessDenied is assigned a value but
never used` warning in `spaces-page.test.tsx`, present before this pass and untouched by it.

**Unrun checks, stated rather than implied:** no repo-wide gate was run, per the hard rules — so
`pnpm type-check`, `pnpm type-check:specs`, `check:file-sizes`, `check:named-handlers`,
`check:response-contracts` and `pnpm typecheck:test` are all unverified for these edits. `next/jest` uses
SWC and does not typecheck, so a green Jest run is **not** type evidence. The frontend edits introduce no
new `any`/`as`/`@ts-ignore`; the new backend spec uses the `as never` / `as unknown as Db` DI-double
pattern every sibling spec in `modules/kb/wiki` already uses, since Nest service doubles cannot be
constructed structurally — that is the only assertion this lane added anywhere, and it is confined to
test files.
