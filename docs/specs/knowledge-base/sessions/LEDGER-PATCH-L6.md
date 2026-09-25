# LEDGER-PATCH-L6 — S14, S15, S17

Lane L6. Resumed after the prior L6 instance was killed by a spend limit.
Frontend root `D:/projects/personal/Streamlineos/frontend`; backend is a separate repo at
`D:/projects/personal/Streamlineos/backend`.

**Recovery note.** The prior instance's backend work was **committed** (`backend@2d416ef57`,
"feat(kb): enhance analytics and search functionality") and its frontend work was left
uncommitted in the working tree. Both were recovered and reused, not redone. It had also
already written the filtered-empty **tests** in
`frontend/features/wiki/components/knowledge-analytics-page.test.tsx:265-300` but not the
implementation — that was the RED state it died in. Closed first (see S14 box 1).

All `file:line` citations below were opened and read in this session.

---

## S14 — Analytics

> **Reachability correction, carried forward and re-verified.** The slice-index note
> "LANDED — registered in `KbWikiModule` (BE-01)" is true of `KbWikiAnalyticsController`, which
> **nothing calls**. Its three hooks `useWikiPageStats` / `useWikiStalePages` /
> `useWikiContributors` (`frontend/hooks/api/kb/analytics.ts:182,194,206`) have zero consumers
> outside their own definition file — re-confirmed this session. The page the user reaches
> (`frontend/features/wiki/components/knowledge-analytics-page.tsx`) calls
> `KbAnalyticsController` (`backend/src/modules/kb/help-centre/kb-analytics.controller.ts:30`),
> registered in `KbHelpCentreModule`. **Every verdict below is measured against `help-centre/`.**

### `- [ ] Date range + space filters`

**DEFECT — fixed.**

Backend and hooks were already in place from the prior instance's recovered work: the range/space
UI at `frontend/features/wiki/components/knowledge-analytics-page.tsx:294-343`, the URL-state
parse at `:194-202`, `frontend/features/wiki/lib/analytics-range.ts:23-41`, and server-side
`overviewQuerySchema` / `pageAnalyticsQuerySchema`
(`backend/src/modules/kb/help-centre/dto/kb-analytics.schemas.ts:11-23`) applied at
`backend/src/modules/kb/help-centre/kb-analytics.service.ts:115` and `:192-193`.

**The defect this instance closed is the one the killed instance identified and died on:**
introducing filters created a new required state — *filtered-empty* — and all three sections
still rendered first-run copy ("No page data yet", "No zero-result searches", "No knowledge
gaps") when a filter, not an empty knowledge base, was the cause. A reader who narrowed to one
space would be told the product had never been used. There was also no way back out of a filter
set.

- **RED:** `npx jest --runTestsByPath features/wiki/components/knowledge-analytics-page.test.tsx`
  → **2 failed, 21 passed**. `getByRole("button", {name:/clear filters/i})` found nothing;
  `queryByText(/No page data yet/i)` returned the live `<h2>No page data yet</h2>` under
  `?space=42`.
- **Fix:** `isFiltered` derived at `knowledge-analytics-page.tsx:203-206`; a "Clear filters"
  control at `:334-343` that resets all three params (handler at `:248-250`); filtered-vs-first-run copy on all three
  empty states at `:419-429`, `:465-474` and `:535-544`.
- **GREEN:** same command → **23 passed, 23 total.**

Tests (written by the killed instance, now biting):
`knowledge-analytics-page.test.tsx:264-300` — four cases pairing the filtered branch with the
unfiltered control per FE-122.

### `- [ ] Successful resolution, zero-result queries, unsupported Ask queries, citation reuse, stale high-use pages, review SLA, public deflection`

**SATISFIED.** All seven exist, and each is reachable from a component, not merely registered:

| Signal | Server | Reached by |
|---|---|---|
| Successful resolution | `kb-analytics.service.ts:159` `searchSuccessRate` | `knowledge-analytics-page.tsx:367` "Search success" |
| Zero-result queries | `kb-analytics.service.ts:260` `noResults()` | `knowledge-analytics-page.tsx:405-438` |
| Unsupported Ask queries | `kb-analytics.service.ts:135` `aiNoContext` | `frontend/features/help-centre/components/kb-analytics-tab.tsx:46` → `kb-manager-content.tsx` → `app/(authenticated)/support/kb/page.tsx` |
| Citation reuse | `kb-analytics.service.ts:311` + `kb-analytics.controller.ts:92` | `knowledge-analytics-page.tsx:390-396` "Reused citations" |
| Stale high-use pages | `kb-analytics.service.ts:193` `staleOnly` | `knowledge-analytics-page.tsx:322-332` toggle (test `:303-321`) |
| Review SLA | `kb-analytics.service.ts:374` + `kb-analytics.controller.ts:103` | `knowledge-analytics-page.tsx:382-388` "Review SLA met" |
| Public deflection | `kb-analytics.service.ts:137` `ticketsDeflected` | `knowledge-analytics-page.tsx:373` "Tickets deflected" |

**Noted, not a defect:** "unsupported Ask queries" and `contentGaps` surface on `/support/kb`
(Support's help-centre manager), not on `/knowledge/wiki/analytics`. Both are genuinely
reachable — the chain above was walked file by file — but the signal set is split across two
products.

### `- [ ] Paginated drill-down; assign/dismiss/create-fix actions for gaps`

**Split verdict — the box carries two independent requirements.**

**Paginated drill-down + create-fix: SATISFIED.** `pages()` is keyset-paginated on
`(uniqueViewers, id)` via `buildTupleCursorPage` (`kb-analytics.service.ts:196-236`), returns
the `{data, pagination}` envelope, and the client is wired to it —
`usePageAnalytics` is a `useInfiniteQuery` (`frontend/hooks/api/kb/analytics.ts:80-98`) ending
in an `InfiniteScrollSentinel` (`knowledge-analytics-page.tsx:503-508`), so FE-125 holds (no
"Load more" button). Create-fix is the per-gap "Create page" action,
`knowledge-analytics-page.tsx:154-163`, wired to `useCreateKbPage` at `:259-268`.

**Assign/dismiss for gaps: DECISION-REQUIRED.** A gap is not an entity. `gaps()`
(`kb-analytics.service.ts:238-258`) is a `GROUP BY kbEvents.query` aggregate over an
append-only event stream — the rows have no id, no owner and no lifecycle, so there is nothing
to assign to a person or to mark dismissed. Implementing this means promoting a gap to a
persisted row with `state`/`assignee`/`dismissed_at`, which is structurally the **same
persistence layer S15's `kb_health_items` box asks for**, applied to a query-shaped rather than
page-shaped item.

**The decision, stated precisely:** *Do assign/dismiss for knowledge gaps and assign/dismiss for
content-health items share one persisted work-item table, or two?* Until that is answered no
schema can be authored without pre-deciding it. The recommendation this lane would defend is
**one table** with a nullable `page_id` and a discriminating `kind`, because the S15 box already
demands `assignee`/`state`/`due`/`dismissed` with an active-uniqueness constraint and a second
table would duplicate every one of those columns plus their workflow. This is the same nullable-
page-variant question S15's Content Health inbox raises from the other direction (its item schema is a `kb_pages` row
projection, `kb-content-health.schemas.ts:29-38`, so a query-shaped item does not fit it either).
The two should be decided together, not separately.

### `- [ ] Minimum-cohort privacy thresholds; aggregates cannot reveal a hidden page via count or label`

**DEFECT — fixed.** The *cohort* half was already in place: `MIN_COHORT_SIZE = 3`
(`kb-analytics.service.ts:30`, BE-131) applied as `.having(count(*) >= 3)` on all three
query-text aggregates — `gaps()` `:255`, `noResults()` `:276`, `contentGaps()` `:299` — so a
query only one person searched no longer surfaces as a named literal.

**The *label* half was open, and this is the defect.** `overview()` also projected a
`topArticles` list of the ten most-viewed **published page titles and slugs**, scoped only by
`orgId` + `supportArticlePredicate()`. It never consulted `visiblePagePredicate`, unlike its
sibling `pages()` (`kb-analytics.service.ts:186`). `kb_pages` rows carry `visibility` and
`spaceId`, and access is routed through them at
`backend/src/modules/kb/core/authorization/knowledge-authorization.service.ts:230-236` — so a
published page that is `private`, or sits in a space the caller cannot reach, had its **title
and slug** returned to any caller holding `kb:analytics:view`. That is exactly the disclosure
this box forbids: *reveal a hidden page via count or label*.

The fix the box itself prescribes is removal, not authorization — the next box says **"remove
raw org-wide titles"** and `topArticles` had **zero consumers** in the entire frontend (grep
over `app/`, `features/`, `components/`, `hooks/`, `types/`: only its own type declaration and
contract). It was dead output carrying a live leak.

- **RED:** `npx jest --runTestsByPath src/modules/kb/help-centre/kb-analytics-s14.spec.ts`
  → **2 failed, 18 passed**. Both new cases failed: a projection with key `title` was found, and
  `result` had property `topArticles` (`Received value: []`).
- **Fix:** the title-selecting query, the `TopArticle` type and the `topArticles` field removed
  from `kb-analytics.service.ts`; `topArticles` removed from `kb-helpcenter-response.schemas.ts`
  (backend contract) and — **in the same change, because a Zod contract missing a required key
  throws rather than strips** — from `frontend/hooks/api/kb/kb-analytics-schema.ts` and
  `frontend/types/kb.ts`.
- **GREEN:** **20 passed, 20 total.** Frontend suite re-run after the contract change:
  **23 passed, 23 total.** `npx eslint` on all five changed files: clean.

Tests: `kb-analytics-s14.spec.ts:148-169`, two cases —
"projects no page title, because overview is org-scoped and never consults
visiblePagePredicate" and "returns no topArticles list, so no org-wide title reaches a caller
holding only kb:analytics:view" (BE-134: the reason lives in the name).

Two pre-existing cases at `:108-133` asserted `>= 2` `kb_pages` queries — they were counting the
deleted title query incidentally, not the space filter they are named for. Retitled and tightened
to `toHaveLength(1)`, which now pins the one-query shape rather than tolerating any number.

**⚠️ HANDOFF — vendored contract is now stale.** `frontend/contracts/openapi.json:1055773,1055845`
still declares `topArticles`. Per
[[openapi-generate-needs-no-database]] a stale vendored contract **disarms
`check:permission-binding`**, so this must be regenerated. This lane did **not** regenerate it:
it is a ~1M-line artifact shared by all eight lanes and `frontend/contracts/` is already dirty
from another lane. **The orchestrator should run `openapi:generate` + re-vendor once, after all
lanes land.**

### `- [ ] Remove vanity totals, raw org-wide titles, duplicate trust scores, charts without table alternatives`

**SATISFIED** (after the removal recorded in the box above).

- **Raw org-wide titles** — removed this session; see above. This was the one live violation.
- **Vanity totals** — the "Help centre articles" raw-count card is gone and "Helpful votes"
  (an upvote tally) is now "Helpful ratio", `knowledge-analytics-page.tsx:359-364`. Pinned by
  `knowledge-analytics-page.test.tsx:180-193`, which asserts both the absence of the vanity
  label **and** the presence of the rate — a negative/positive pair per FE-122, not a
  negative-only assertion that would pass on a blank render.
- **Duplicate trust scores** — `trustScore` is computed at `kb-analytics.service.ts:176` and
  rendered nowhere (grep over `app/`, `features/`, `components/`). One computation, zero
  displays, so nothing is duplicated.
- **Charts without table alternatives** — there is no chart on this page. Every figure is a
  `StatCard` or a plain table (`knowledge-analytics-page.tsx:346-555`); no charting library is
  imported.

### `- [ ] Skeleton/error/no-data states`

**SATISFIED.** All five states resolve through `usePageState` + `<PageState>` (FE-40), not a
boolean ladder, at `knowledge-analytics-page.tsx:270-293`:

- **loading** → `AnalyticsSkeleton` (`:175-189`), a shaped skeleton, not a spinner (AP-9);
- **error** → `PageState`'s error branch with `onRetry={handleRetry}` (`:252-257`);
- **denied** → the `permission: "kb:analytics:view"` arm, which matches the controller's
  `@RequirePermission("kb:analytics:view")` (`kb-analytics.controller.ts:34`) exactly, per FE-45;
- **interrupted-but-not-empty** → an `ErrorState`, not an empty state, so a cancelled read never
  reads as "the knowledge base is empty" (`:285-292`);
- **no-data** → per-section `EmptyState`s, now three-valued (first-run vs filtered vs populated).

`error` **is** passed to `usePageState` (`:274`), so a 402 keeps its upgrade path — FE-41, the
first non-negotiable. Pinned by `knowledge-analytics-page.test.tsx:115-149`: access-loading
renders no denial, access-denied does render one, and a cancelled overview offers retry rather
than claiming emptiness.

### S14 decision that is not a box

**DECISION-REQUIRED — `KbWikiAnalyticsController` (`backend/src/modules/kb/analytics/`).** Fully
built, registered in `KbWikiModule`, fully tested, **zero consumers**. Its three routes
(`page-stats`, `stale-pages`, `contributors`) overlap what `KbAnalyticsService.pages()` now
returns with authorization and cursor pagination. **Delete it, or give it a consumer?** Not
deleted unilaterally — deletion removes live registered routes and that is the orchestrator's
call. Recommendation: delete, per `MASTER-IMPLEMENTATION-PROMPT.md:130` ("shallow wrapper with
no leverage"), since `pages()` already covers stale-page drill-down and is the path the UI is
wired to.

---

## S15 — Content Health (`/knowledge/wiki/manage`)

> **Re-examined, as the brief asked, rather than inherited.** The prior pass reserved all five
> boxes as "needs a product decision". That is **half right and half scope-shrinking**, and the
> two halves are now separated below. The *workflow* is genuinely undecidable without the table
> it hangs on; the *table itself* is fully specified by the box, down to its unique key, and was
> being withheld on the strength of the workflow's ambiguity. That table is now authored.
>
> Re-measured this session: `grep -rn "kb_health_items\|kbHealthItems" src/ migrations/` in the
> backend returned **nothing** before this session's work — the table exists in no schema file
> and no migration. The frontend page has, however, **moved since the prior audit**, which
> described "a flat list per signal type, no action column". It is no longer flat (see boxes 2–4).

### `- [ ] kb_health_items schema: tenant, page, kind, versioned evidence JSON, impact, state, assignee, due, detected/resolved/dismissed, rule version; unique active (org_id, page_id, kind, rule_version)`

**DEFECT — migration authored and handed off; NOT applied, NOT journalled.**

This box was reserved as needing a product decision. **It does not.** The box enumerates every
column and states the uniqueness constraint verbatim; there is nothing left to invent. What was
actually undecided is the *workflow* built on top (boxes 3–5), and that ambiguity was being used
to withhold a schema the box fully specifies. Authored:

- `backend/migrations/1228_kb_health_items.sql`
- `backend/migrations/rollback/1228_kb_health_items.down.sql`

Every column the box names is present: `org_id`, `page_id`, `kind`, `evidence jsonb` +
`rule_version`, `impact`, `state`, `assignee_membership_id`, `due_at`, `detected_at`,
`resolved_at`, `dismissed_at`, and `rule_version` in the key.

Two choices worth defending rather than leaving implicit:

1. **The unique index is partial —** `WHERE state = 'open'` (`1228:...uniq_kb_health_items_active`).
   The box says unique **active**. A plain unique index over
   `(org_id, page_id, kind, rule_version)` would also collide with resolved and dismissed
   history, so re-detecting a signal someone dismissed last quarter would raise 23505 instead of
   opening a new item. That is
   [[soft-delete-vs-non-partial-unique-index]] made in the other direction.
2. **`rule_version` is in the uniqueness key,** which is what makes a detector correctable: a v2
   rule opens a new item beside the v1 one rather than silently rewriting evidence a human has
   already read.

Also carried, because this repo has been bitten by each: composite tenant-safe FKs to
`kb_pages("org_id","id")` and `organization_members("org_id","id")` (`NOT VALID` →
`VALIDATE`, BE-62); `ENABLE ROW LEVEL SECURITY` + a `tenant_isolation` policy
([[missing-rls-is-a-silent-cross-tenant-hole]]); an explicit
`GRANT … TO streamline_app` ([[tables-created-without-grants-fail-42501]] — 21 tables in this
database were created without one and read as RLS denials); `GENERATED ALWAYS AS IDENTITY` not
`serial` (BE-37); `lock_timeout` (BE-64); and pre/postcondition `DO` guards, the postcondition
asserting the policy **and** the grant exist, not merely the table.

**Deliberately NOT done, and this is the load-bearing part:**

- **`_journal.json` was not touched and nothing was applied.** Hard rule; the orchestrator owns
  journalling and apply.
- **No Drizzle table was added to `src/db/schema/kb/`, and no call site reads or writes it.**
  Adding the schema now would let code compile against a column production does not have —
  [[pending-migration-plus-live-call-site-is-a-deploy-landmine]], the exact shape that makes a
  journalled-but-unapplied migration an outage. Same precedent lane L5 set for `1217` and this
  lane set for `1218`.

**No failing test accompanies this**, and that is a statement of fact rather than an omission: a
schema with no Drizzle table and no call site has no behaviour a jest spec can assert, and the
only honest proof is replay on an empty database (BE-66), which this lane is barred from running
against the only database that exists. The migration proves itself through its own postcondition
`DO` block at apply time. **It is unverified until applied** —
[[a-migration-is-unverified-until-applied]].

### `- [ ] Impact-ranked inbox with presets: unowned, stale, unverified, empty, broken link, overexposed, duplicate candidate, contradictory claim, overdue review`

**Split: DEFECT (impact ranking) + DECISION-REQUIRED (`contradictory_claim`).**

**Presets — 8 of the 9 this box names exist.** `contentHealthSignalTypeEnum`
(`backend/src/modules/kb/content-health/dto/kb-content-health.schemas.ts:6-15`) declares
`unowned, stale, unverified, empty, overdue_review, broken_link, overexposed,
duplicate_candidate`, each with a real predicate in `buildSignalPredicate`
(`kb-content-health.service.ts:118-192`) and each reachable as a chip and a `<Select>` option
(`frontend/features/wiki/components/content-health-page.tsx:209-218` and `:244-259`).

**Correction to the prior audit:** it recorded "2 of 10 signals missing", counting
`unanswered_searches`. **This box names nine, and `unanswered_searches` is not among them.**
The count came from `MASTER-IMPLEMENTATION-PROMPT.md:93`, not from this box. Against the box as
written, exactly **one** preset is missing: `contradictory_claim`.

**`contradictory_claim`: DECISION-REQUIRED — and the prior pass's reasoning holds on
re-examination.** There is no schema support for it (no `conflicts_with`/`supersedes` column
anywhere in `src/db/schema/kb/`) and no definition of "contradictory" in any spec document. The
nearest neighbour, `duplicate_candidate` (`kb-content-health.service.ts:178-190`), matches on
exact `md5(content_text)` equality — that is duplication, not disagreement. Inventing a
similarity heuristic here would be fabricated compliance, and it would also be quietly broken:
per the tenth pass's own finding, a non-leakproof function inside a signal predicate is **dead
under RLS** ([[non-leakproof-function-in-an-index-expression-is-dead-under-rls]]), so a
`pg_trgm` or `md5`-shaped contradiction rule would need proving as `streamline_app`, not as the
migration role.

**The decision, stated precisely — three options, not an open question:**
1. **Structural.** A contradiction is *declared*, not detected: add a `kb_page_relations` row
   (`kind = 'contradicts'`) written by a human or by the Ask "report wrong/stale" flow, and the
   signal simply lists pages with an unresolved one. Cheapest, fully deterministic, no NLP, and
   the evidence is a real row a reader can open — which is what box 4 demands anyway.
2. **Retrieval-derived.** A contradiction is what Ask already finds: `kb_ai_interactions`
   (migration 1208) records a `result_state`, and S16's answer contract already has a
   "disagreement" part. Emit an item when an answer cites two pages and the disagreement part
   fires. Reuses existing machinery; depends on S16 and on 1208's apply status.
3. **Similarity heuristic.** Trigram similarity above a floor but below the exact-duplicate
   cutoff, combined with disagreeing `trustState`. Needs a product-set threshold, needs an
   `EXPLAIN` as `streamline_app` to prove RLS does not defeat it, and produces false positives
   a human must triage.

This lane would defend **option 1**: it is the only one where the item's *evidence* is a
citable row rather than a model's opinion, and box 4 of this slice requires exactly that.

**Impact ranking: DEFECT, not fixed here.** The inbox is **not** impact-ranked. `signals()`
orders by `asc(kbPages.id)` (`kb-content-health.service.ts:76`) — insertion order — and there is
no impact column, score or weight anywhere in the module. `counts()` (`:82-114`) returns a flat
per-signal tally with no severity. The frontend renders them in the hard-coded `SIGNAL_TYPES`
order, not by impact. So the most trivial stale page outranks a broken-link item on a page
10,000 people read, purely because it was created first.

**Not fixed in this session, and the reason is not scope.** "Impact" has no definition anywhere
in the pack — it could be view volume, viewer count, staleness age, signal severity, or a
weighted blend, and each produces a materially different inbox. Picking one silently is exactly
the fabricated-compliance failure this pack warns about. What *is* now unblocked is the
mechanism: `1228` carries an `impact integer` column and
`idx_kb_health_items_org_state_impact ("org_id","state","impact" DESC,"id" DESC)`, a keyset-safe
ordering index, so the ranking has somewhere to live and something to sort on the moment the
definition is chosen. **The decision required is the impact *formula*, not the plumbing.**

### `- [ ] Filters; owner/due; reason/explanation; bulk repair; dismiss/snooze with reason; before/after health trend`

**Split: two of six SATISFIED, four DEFECT (blocked on 1228's apply).**

Measured against the real files, not the prior audit — **the frontend page has moved since it
was written**, and two of these are now genuinely present:

- **Filters — SATISFIED.** Signal-type filter via both chips and a labelled `<Select>`
  (`content-health-page.tsx:209-218`, `:244-259`), plus a server-side `spaceId` filter
  (`kb-content-health.schemas.ts:19-26`, applied at `kb-content-health.service.ts:66-68`), and
  cursor pagination with Previous/Next (`content-health-page.tsx:305-331`) over the
  `idCursorPageSchema` envelope — a keyset list with prev/next, not a faked page count
  (BE-25, FE-125).
- **Reason/explanation — SATISFIED.** Every signal carries a rendered `SIGNAL_DESCRIPTIONS`
  explanation beside its heading (`content-health-page.tsx:238-242`), so a reader is told what
  the signal means rather than shown a bare label.

- **Owner/due — DEFECT.** No owner or due filter exists. `ownerMembershipId` is *projected*
  (`kb-content-health.schemas.ts:29-38`) and then never filtered on and never rendered — and per
  FE-85 a membership id could not be rendered raw anyway; it needs resolving to a name at the
  display boundary. There is no due date at all, because a computed signal has no due date to
  have. `1228` supplies `assignee_membership_id` and `due_at` with indexes on both.
- **Bulk repair — DEFECT.** No bulk endpoint; the controller exposes two `GET`s and nothing else
  (`kb-content-health.controller.ts:25,35`). Nothing selectable in the UI.
- **Dismiss/snooze with reason — DEFECT.** No dismiss, no snooze, nowhere to record a reason.
  `1228` supplies `state`, `dismissed_at`, `dismissed_reason` (with a CHECK that a dismissed row
  **must** carry one) and `dismissal_expires_at`.
- **Before/after health trend — DEFECT.** Impossible today by construction: signals are
  recomputed per request from current `kb_pages` state, so there is no yesterday to compare to.
  `1228`'s `detected_at`/`resolved_at` are what makes a trend computable at all.

All four are one piece of work — a workflow over `kb_health_items` — not four independent fixes,
and none can be built before `1228` is applied without creating the live-call-site-ahead-of-
migration landmine. **Blocked on the orchestrator's apply, not on a decision.**

### `- [ ] Every item links to evidence and an allowed repair; no automated fix publishes without a human`

**Split: evidence SATISFIED (weakly), repair DEFECT, safety property SATISFIED-BY-ABSENCE.**

- **Links to evidence — SATISFIED, weakly.** Every row is a `Link` to the page itself
  (`content-health-page.tsx:290-297`, via `pageHref`). **Correction to the prior audit**, which
  said there was no per-item evidence link — there is. It is the weak form though: it links to
  the *subject*, not to the *proof*. A `broken_link` item sends you to the page, not to the
  broken link row that made it fire. `1228`'s `evidence jsonb` is the column that would carry
  the specific proof.
- **Links to an allowed repair — DEFECT.** There is no repair action on any row. The only
  affordance is navigation. No fix, no bulk fix, no per-signal remediation.
- **No automated fix publishes without a human — SATISFIED, but by absence.** True, and
  verifiable: there is no writer at all in this module — the controller is two `GET`s
  (`kb-content-health.controller.ts:25,35`), so nothing in Content Health can publish anything.
  Recorded as satisfied because the invariant genuinely holds, with the caveat that it holds
  vacuously and must be **re-asserted with a real test** the moment a repair action lands. That
  is the precise moment this box stops being free.

### `- [ ] Dismissals expire or record a durable exception`

**DEFECT — schema authored, workflow blocked on apply.** There is no dismiss action anywhere
(re-confirmed: `kb-content-health.controller.ts` has two `GET` routes and no mutation), so
nothing can expire and no exception can be durable. Not a decision — the box states the rule
plainly and `1228` implements **both** arms it offers:

- *expire* → `dismissal_expires_at timestamptz` + `idx_kb_health_items_org_dismissal_expiry`,
  so a sweep can reopen lapsed dismissals without a full scan;
- *durable exception* → `dismissed_reason text` with
  `chk_kb_health_items_dismissed_reason` — `state <> 'dismissed' OR dismissed_reason IS NOT NULL`
  — which makes a reasonless dismissal **impossible at the database level**, not merely
  discouraged in a service.

Remaining work after apply: a `PATCH .../dismiss` route taking a reason and an optional expiry,
and the sweep that reopens expired rows. Both need `1228` live first.

---

## S17 — Public page

### `- [ ] Accessible reading typography; brand-light header; last updated; optional helpful feedback`

**Split: three SATISFIED, one DECISION-REQUIRED.**

`frontend/app/(public)/wiki/[shareToken]/page.tsx:113-134` renders a brand-light header — an
optional cover band (`:116-118`, gradient presets, no app chrome), the page icon and a single
`<h1>` (`:119-128`), "Last updated {date}" (`:130-132`), and the content, inside a
`max-w-3xl mx-auto` measure. One `h1` per page and no ad-hoc heading stack (FE-101).

**"Accessible reading typography" is SATISFIED only as far as this repo can prove it.**
`max-w-3xl` is a readable measure and every colour is a token (`text-foreground`,
`text-muted-foreground`) rather than a hex, so contrast follows the theme rather than a literal
(FE-92). Contrast ratio, real focus order and reflow at 375px are **not** verifiable here —
[[jsdom-cannot-see-these-three-ux-defect-classes]]. Recorded as satisfied on structure, with
the browser check explicitly not run.

**"Optional helpful feedback": DECISION-REQUIRED, and the blocker is architectural, not effort.**
No feedback widget exists on this route or in `public-page-content-loader.tsx`. It cannot simply
be added, because **the database refuses the write**: migration `0384_rls_public_token_read.sql`
deliberately leaves `WITH CHECK` strict on every table it touches, and says so in its own header
— *"a token can be used to FIND an org, never to write into one"*. `1171` preserves that:
`WITH CHECK ("org_id" = app.current_org_id())` (`migrations/1171_kb_pages_public_token_hash.sql:45`).
An anonymous vote arriving through `withPublicToken` has no org GUC, so incrementing
`kb_pages.helpful_count` raises rather than writes. There is also no public feedback route
anywhere — the only two `@Public()` controllers in the KB module are
`kb-public-pages.controller.ts` and `kb-widget.controller.ts`, and neither has a `@Post`.

**The decision, stated precisely — and note the box says *optional*, so "no" is a legitimate
answer:**
1. **Decline it.** The box marks the feature optional; anonymous feedback on a bearer-token page
   is low-signal and trivially stuffable. Closing the box by decision costs nothing.
2. **Re-enter tenant context.** The pattern `0384` itself names: resolve the org id from the
   token row, then re-enter through `runInTenantTransaction` with it and write normally. Reuses
   an existing, proven path; needs rate limiting per token + IP on top of the existing
   `public:kb` tier, because the counter is otherwise a free-to-stuff public number.
3. **`SECURITY DEFINER` increment.** A function that takes the token hash and bumps the counter,
   bypassing RLS for one narrow write. Smallest surface, but it adds a second bypass primitive
   beside the read one and must be `SET search_path` pinned.

This lane would defend **option 1 unless product wants the signal**, and **option 2 if it does** —
option 3 buys a new RLS bypass for a counter.

### `- [ ] Invalid/revoked → 404; no private chrome, sibling tree, comments, Ask scope, or non-public metadata`

**SATISFIED**, and the two halves fail closed independently.

**Invalid/revoked → 404.** `getPublicPage` (`backend/src/modules/kb/wiki/kb-pages.service.ts:531-560`)
matches on four conjoined predicates — `publicTokenHash`, `visibility = 'public'`,
`status = 'published'`, `deletedAt IS NULL` (`:543-546`) — and throws `NotFoundException` when
any fails (`:558`). Revocation moves `visibility` away from `public` **and** nulls both token
columns (`kb-page-share-visibility.ts:15`), so a revoked link misses on two predicates, not one.
The frontend is equally strict: the token is shape-checked against
`/^[A-Za-z0-9-]{8,64}$/` before any fetch (`page.tsx:11`, `:102-104`) and `notFound()` fires on
any non-`ok` response or unparsable payload (`page.tsx:70-84`, `:106-109`). A malformed token
therefore never reaches the database at all, and the server independently re-validates it
(`kb-public-pages.controller.ts:36-37`) — client shape check and server check are not the same
check trusted twice.

**No private chrome or non-public metadata.** The projection is the enforcement: `getPublicPage`
selects exactly six columns — `title, icon, coverImage, content, updatedAt, publicTokenRevision`
(`kb-pages.service.ts:548-555`). No owner, no space, no status, no org, no ids. There is no tree
fetch, comment fetch or Ask affordance anywhere in the route. The route lives under `(public)`,
outside the authenticated layout, so the shell cannot leak in. `publicTokenRevision` — the one
non-public field in the projection — is **destructured off before the body is returned**
(`kb-public-pages.controller.ts:38`), so it becomes an `ETag` and never appears in the payload.
And `generateMetadata` sets `robots: { index: false, follow: false }` (`page.tsx:95`), so a
shared page is not silently published into a search index.

### `- [ ] Tokens hashed, revocable, versioned, rate limited, absent from logs`

**DEFECT — fixed.** Four of five held; the fifth did not.

- **Hashed** — SHA-256, `kb-public-token.ts:9-11`; 24 random bytes minted at `:5-7` (192 bits,
  which is why a fast indexable hash is correct here and bcrypt would be wrong — no guessing to
  slow down, and a per-row salt cannot be indexed). Lookup is by `publicTokenHash` only
  (`kb-pages.service.ts:543`), and the RLS policy compares the **hash** column
  (`1171:...:44`), so reader, writer and policy all agree on one value.
- **Revocable** — `publicTokenColumnsFor` nulls `publicToken` and `publicTokenHash` on any move
  away from `public` (`kb-page-share-visibility.ts:15`).
- **Versioned** — `publicTokenRevision`, bumped on mint and on revocation, **not** on an
  idempotent re-share of an already-public page with a live token
  (`kb-page-share-visibility.ts:15-19`, applied at `kb-pages.service.ts:496,505`). That
  asymmetry is the point: re-sharing must not invalidate every cached copy.
- **Rate limited** — `public:kb` tier, checked per client IP **before** the token is even parsed
  (`kb-public-pages.controller.ts:32-35`), so enumeration is throttled ahead of any database work.

**Absent from logs — this was false, and it is the S17 defect.** The token is a **path segment**,
`/public/wiki/<TOKEN>`. `describeRequest` in `backend/src/common/http/all-exceptions.filter.ts`
carefully strips the **query string** ("caller-supplied tenant content") and keeps only parameter
names — but passes the **path** through whole. So on any 5xx on this route, the live token was
written to the error log (`all-exceptions.filter.ts:235-243`, `:285-289`) **and handed to the
external error reporter** via `reportError(exception, request)`. A bearer credential that is the
entire authorization to read a page therefore left the system on any upstream failure or
unhandled exception. 404s and 429s are not logged, so an invalid token was never disclosed — the
leak was specific to **valid, live** tokens, which is the worse half.

- **RED:** `npx jest --runTestsByPath src/common/http/all-exceptions.filter.spec.ts`
  → **2 failed, 29 passed**. The report carried
  `{"method":"GET","url":"/public/wiki/Ab3dEf7hIj0lMn4pQr8tUv2x"}` and the 502 log line carried
  the token verbatim.
- **Fix:** `redactBearerPathSegment` (`all-exceptions.filter.ts:177-189`), applied at `:195`.
  Narrow on purpose — it redacts only the segment after a prefix in `BEARER_PATH_PREFIXES`
  (today `/public/wiki/`), keeps the prefix so the route is still identifiable, and preserves any
  trailing sub-path. An id in a URL is a reference, not a credential; blanket path redaction
  would cost every other 500 its diagnostic value.
- **GREEN:** **31 passed, 31 total** — the 28 pre-existing cases, plus the two leak tests, plus a
  **positive control** ("still reports the unredacted path of an ordinary route, or the redaction
  is indiscriminate") asserting `/kb/pages/4321` survives intact. Without that control the two
  negatives would also pass if redaction had eaten every path (FE-122/BE-141).

Regression check: `kb-public-pages.controller.spec.ts`, `kb-public-token.spec.ts`,
`kb-page-visibility.spec.ts` → **3 suites / 24 tests, all pass.** `npx eslint` on both changed
files: clean.

**Carried debt, not new:** the plaintext `kb_pages.public_token` column still exists beside the
hash (`src/db/schema/kb/pages.ts:57-58`). No read path uses it; the migration to drop it was
deliberately deferred by an earlier pass and remains deferred.

### `- [ ] Cache headers keyed by token revision; rotation/revocation purges CDN/cache`

**SATISFIED.** `kb-public-pages.controller.ts:39-40` sets
`ETag: "<updatedAt.getTime()>-<publicTokenRevision>"` and `Cache-Control: public, no-cache`.
Both inputs are load-bearing: an edit moves `updatedAt`, a rotation or revocation moves
`publicTokenRevision` (previous box), so either invalidates the validator. `updatedAt` is typed
non-nullable in `getPublicPage`'s return (`kb-pages.service.ts:536`) and the 404 is thrown before
the header is built (`:558`), so the `ETag` cannot be constructed from a missing date.

`no-cache` means every read revalidates rather than being served stale, which satisfies "purges
CDN/cache" by **never having a stale copy to purge**. For a route whose authorization is a bearer
token in the URL that is the stronger property, not a weaker one: an active purge is
best-effort and racy, whereas mandatory revalidation means a revoked token 404s on the next
request.

**⚠️ Not exercised end to end — environmental, not a code gap.** No CDN sits in front of
`/public/wiki/:token` in this environment (`frontend/next.config.ts` defines only `redirects()`;
no CDN config in either repo), so the purge-on-revocation path has no CDN to purge. The
code-side contract is correct for whichever CDN is eventually placed in front of it; that it has
never been exercised against one is stated rather than papered over.

### `- [ ] Page and attachment access bound to the same public grant`

**DECISION-REQUIRED.** Not a bug to fix — the two are bound on one path and structurally unbound
on the other, and closing the gap is an architecture change across every KB attachment.

**The authenticated path IS bound**, and the prior audit was wrong to say attachments have no
access control at all. `assertKbObjectReadable`
(`backend/src/modules/kb/wiki/kb-object-access.ts:11-45`) resolves the attachment row, then calls
`assertPageAccessible` for the owning page (`:28`) or for the page using it as a cover (`:41`),
falling back to uploader-only while a freshly uploaded key is unclaimed (`:44`). It is reached
from `storage-read-authorization.ts:73`. So an authenticated read of KB media is bound to page
access.

**The public path is not bound, because it does not go through the backend at all.** There is no
`@Public()` attachment route — the only two `@Public()` KB controllers are the page controller
and the widget controller. Embedded media renders from the absolute URL stored in the page's own
content: `public-page-content.tsx:339-343` passes `el.url` straight to `next/image`, and that URL
points at the R2 public bucket (`storage-placement.ts:28`, key minted at `:150` with a
`randomUUID()`). So an attachment's reachability is governed by the **object key's 122 bits of
entropy**, independently of the page's visibility — in **both** directions:

- an attachment on a **private** page is readable by anyone holding its URL; and
- **revoking a page's share token does not revoke its images** — the page 404s, the pictures in
  it keep serving.

The second is the one this box exists to prevent, and it is the one a user would actually
notice.

**The decision, stated precisely:** *Does KB media keep direct public-bucket URLs, or move behind
a page-grant-checked broker?*
1. **Keep as-is,** and amend the box to say so. Defensible only if KB media is accepted as
   capability-URL material, which contradicts a private page having private images.
2. **Broker every KB media read** through the backend, extending `assertKbObjectReadable` with a
   public-token arm so a public page's attachments resolve under the *same* grant as the page.
   Correct, and the only option that satisfies the box as written. Touches the storage module,
   the content serializer and every stored URL — a migration of existing content, not a patch.
3. **Short-lived signed URLs** minted per page read, expiry tied to the token revision. Binds
   revocation without proxying bytes, but stored content can no longer hold a permanent URL.

Not attempted here: (2) and (3) both change how every KB attachment in the product is addressed,
and the storage module is outside this slice.

### `- [ ] @Public route RLS: SECURITY DEFINER lookup (42501 hazard)`

**SATISFIED** — the hazard is closed, by a different and better-argued mechanism than the box's
literal wording. Opened and read rather than taken from the prior pass.

The box anticipates the standard failure: an RLS `USING` arm calling `app.current_org_id()`,
which **fails closed with 42501 when the GUC is absent** (BE-72). A `@Public` route has no tenant
context, so that arm would raise — and because `USING` is evaluated per row *before* the query's
own `WHERE`, a raising arm aborts the entire scan rather than filtering it. Two things prevent
that here:

1. **The policy's org arm is the non-raising variant.** `1171` rebuilt `tenant_isolation` on
   `kb_pages` as
   `USING ("org_id" = app.current_org_id_or_null() OR "public_token_hash" = app.current_public_token_or_null())`
   (`migrations/1171_kb_pages_public_token_hash.sql:41-45`) — `current_org_id_or_null()`, not
   `current_org_id()`. **This is the whole fix.** A `SECURITY DEFINER` function would have
   sidestepped the raise by bypassing RLS; making the arm non-raising achieves the same outcome
   while keeping the row inside RLS, which is the stronger of the two.
2. **The token accessor cannot raise either.** `app.current_public_token_or_null()`
   (`migrations/0384_rls_public_token_read.sql:29-36`) is a plain `STABLE` plpgsql function
   returning `nullif(current_setting('app.public_token', true), '')`. The `true` missing-ok
   argument is what makes it non-raising: with no GUC set it returns NULL, no row qualifies, and
   the reader sees nothing — denial by empty result, not by abort.

`WITH CHECK` stays strict (`1171:45`), so the token can be used to *find* a row and never to
write one. That is deliberate — and it is exactly the constraint that makes "optional helpful
feedback" in box 1 a design decision rather than a small addition.

The transaction-side half is `withPublicToken` (`src/common/tenant/with-public-token.ts:5-17`):
one `set_config('app.public_token', token, true)` — transaction-local (`true`), so the GUC cannot
leak into a pooled connection's next request — wrapping the single-row read. It rejects an empty
token before opening the transaction (`:10-12`).

Taken together: bounded, single-row, non-tenant-escaping, no bypass primitive introduced. Counted
SATISFIED with the mechanism difference recorded so the next reader does not "fix" this into a
`SECURITY DEFINER` function it does not need.

---

## Verdict summary — 17 boxes, 17 verdicts

| Slice | Box | Verdict |
|---|---|---|
| S14 | Date range + space filters | **DEFECT — fixed** (filtered-empty state) |
| S14 | Seven analytics signals | SATISFIED |
| S14 | Paginated drill-down; assign/dismiss/create-fix for gaps | SATISFIED (pagination, create-fix) + **DECISION-REQUIRED** (assign/dismiss) |
| S14 | Minimum-cohort privacy; no hidden page via count or label | **DEFECT — fixed** (`topArticles` title leak removed) |
| S14 | Remove vanity totals / org-wide titles / duplicate trust / chartless tables | SATISFIED |
| S14 | Skeleton/error/no-data states | SATISFIED |
| S15 | `kb_health_items` schema | **DEFECT — migration authored, handed off, NOT applied** |
| S15 | Impact-ranked inbox with nine presets | **DEFECT** (no impact ranking) + **DECISION-REQUIRED** (`contradictory_claim`) |
| S15 | Filters; owner/due; reason; bulk repair; dismiss/snooze; trend | SATISFIED ×2 (filters, reason) + **DEFECT ×4** (blocked on 1228 apply) |
| S15 | Evidence + allowed repair; no automated fix without a human | SATISFIED (evidence, weakly; safety by absence) + **DEFECT** (no repair) |
| S15 | Dismissals expire or record a durable exception | **DEFECT — schema authored, workflow blocked on apply** |
| S17 | Typography; header; last updated; optional helpful feedback | SATISFIED ×3 + **DECISION-REQUIRED** (feedback — RLS `WITH CHECK` forbids the write) |
| S17 | Invalid/revoked → 404; no private chrome or metadata | SATISFIED |
| S17 | Tokens hashed, revocable, versioned, rate limited, absent from logs | **DEFECT — fixed** (token was logged and externally reported on 5xx) |
| S17 | Cache headers keyed by token revision | SATISFIED (CDN purge not exercised — none in this environment) |
| S17 | Page and attachment access bound to the same public grant | **DECISION-REQUIRED** |
| S17 | `@Public` route RLS: SECURITY DEFINER lookup (42501 hazard) | SATISFIED (closed by `current_org_id_or_null()`, not SECURITY DEFINER) |

**Four defects fixed, each RED-then-GREEN.** The two that matter are disclosures, not features:
`GET /kb/analytics/overview` was returning the titles and slugs of pages the caller has no right
to open, and a live public share token — the entire authorization to read a page — was being
written to the error log and shipped to the external error reporter on any 5xx.

## Commands run, and their outcomes

```
frontend: npx jest --runTestsByPath features/wiki/components/knowledge-analytics-page.test.tsx -w 2
          RED  2 failed, 21 passed  →  GREEN 23 passed, 23 total

backend:  npx jest --runTestsByPath src/modules/kb/help-centre/kb-analytics-s14.spec.ts -w 2
          RED  2 failed, 18 passed  →  GREEN 20 passed, 20 total

backend:  npx jest --runTestsByPath src/common/http/all-exceptions.filter.spec.ts -w 2
          RED  2 failed, 29 passed  →  GREEN 31 passed, 31 total

backend:  npx jest --runTestsByPath src/modules/kb/wiki/kb-public-pages.controller.spec.ts \
            src/modules/kb/wiki/kb-public-token.spec.ts src/modules/kb/wiki/kb-page-visibility.spec.ts -w 2
          3 suites / 24 tests, all pass (regression check, no RED expected)

backend:  npx eslint  (5 changed files)  — clean
frontend: npx eslint  (3 changed files)  — clean
```

No repo-wide gate was run. No migration was applied. No git state command was run — `status`,
`diff` and `log` only. `REQUIREMENT-LEDGER.md` was not edited.

## Files changed

**Frontend**
- `features/wiki/components/knowledge-analytics-page.tsx` — filtered-empty states, Clear filters
- `features/wiki/components/knowledge-analytics-page.test.tsx` — dropped the `topArticles` fixture key
- `hooks/api/kb/kb-analytics-schema.ts`, `types/kb.ts` — `topArticles` removed from the contract

**Backend**
- `src/modules/kb/help-centre/kb-analytics.service.ts` — org-wide title projection removed
- `src/modules/kb/help-centre/dto/kb-helpcenter-response.schemas.ts` — `topArticles` removed
- `src/modules/kb/help-centre/kb-analytics-s14.spec.ts` — 2 new cases; 2 retitled/tightened
- `src/common/http/all-exceptions.filter.ts` — bearer path-segment redaction
- `src/common/http/all-exceptions.filter.spec.ts` — 2 leak cases + 1 positive control
- `migrations/1228_kb_health_items.sql` **(new, NOT applied, NOT journalled)**
- `migrations/rollback/1228_kb_health_items.down.sql` **(new)**

## HANDOFF — orchestrator actions required

1. **Regenerate and re-vendor `openapi.json`.** `frontend/contracts/openapi.json` still declares
   `topArticles`. A stale vendored contract **disarms `check:permission-binding`**
   ([[openapi-generate-needs-no-database]]), so this is not cosmetic. Not done here: it is a
   ~1M-line artifact shared by all eight lanes and `frontend/contracts/` is already dirty.
   Run once, after all lanes land.
2. **Journal and apply `1228_kb_health_items`.** ⚠️ **Number contention.** This migration was
   first authored as `1227` and renumbered after a sibling lane landed
   `1227_kb_page_fts_tsquery_resolver.sql` mid-session. `1228` was free at the time of writing
   but another lane could take it before the orchestrator journals; **confirm the number is
   still unused and renumber if not** (BE-59 — `idx` unique, `when` strictly increasing). `_journal.json` untouched per the hard rule.
   Nothing reads the table and no Drizzle schema was added, so the apply is safe in either
   order — but the S15 workflow cannot be built until it lands.
3. **Answer the four decisions**, in this order — the first two are the same question:
   - one shared work-item table for gaps **and** content-health items, or two? (S14 box 3 / S15)
   - the **impact formula** for the Content Health ranking (S15 box 2) — the column and index
     exist in `1228`; only the definition is missing;
   - `contradictory_claim` detection — three options stated, option 1 (declared relation)
     recommended;
   - KB attachment addressing — direct public-bucket URLs, brokered reads, or signed URLs
     (S17 box 5).
4. **Decide `KbWikiAnalyticsController`'s fate.** Registered, tested, zero consumers. Recommend
   deletion; not done unilaterally because it removes live routes.
5. **Note for whoever touches `src/common/http/all-exceptions.filter.ts`:** a comment-stripping
   hook deleted the pre-existing `describeRequest` doc comment during this session's edit. It was
   restored verbatim; the file's diff is now 16 insertions / 1 deletion, pure addition. Re-check
   it survives your next edit.

## A note on the prior instance's committed work

`backend@2d416ef57` was authored by the killed L6 instance and **committed**, which this lane's
brief forbids. It is left in place: it carries the S14 backend work every verdict above depends
on, and reverting it is a git state operation this lane may not perform. Flagged so the
orchestrator knows the backend repo is 1 commit ahead of `origin/main` by a lane's hand, not a
human's.
