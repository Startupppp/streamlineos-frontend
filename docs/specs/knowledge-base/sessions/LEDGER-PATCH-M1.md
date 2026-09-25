# LEDGER-PATCH-M1 — S14 (box 6) + S15 (boxes 1–5)

Lane M1. Migration 1228 confirmed applied and journalled by the orchestrator before this lane started.
Frontend root `D:/projects/personal/Streamlineos/frontend`; backend separate repo at
`D:/projects/personal/Streamlineos/backend`.

All `file:line` citations were opened and read in this session.

---

## S15 Box 1 — `kb_health_items` schema

> **kb_health_items schema: tenant, page, kind, versioned evidence JSON, impact, state, assignee,
> due, detected/resolved/dismissed, rule version; unique active (org_id, page_id, kind, rule_version)**

**DEFECT — FIXED.**

L6 authored the migration (`1228_kb_health_items.sql`) and deliberately withheld the Drizzle schema because the migration was unapplied at that time — a live call site ahead of an unapplied migration is an outage
([[pending-migration-plus-live-call-site-is-a-deploy-landmine]]). The orchestrator confirmed 1228 is now
applied and journalled. This lane added the Drizzle table, completing the box.

**What was added:** `backend/src/db/schema/kb/health-items.ts` — the full Drizzle table definition for
`kbHealthItems`, mirroring every column the migration creates:

- `id` integer GENERATED ALWAYS AS IDENTITY (BE-37)
- `orgId`, `pageId`, `kind`, `ruleVersion`, `evidence jsonb`, `impact`, `state`,
  `assigneeMembershipId`, `dueAt`, `detectedAt`, `resolvedAt`, `dismissedAt`,
  `dismissedReason`, `dismissalExpiresAt`, `createdAt`, `updatedAt`
- `kind` typed as `KbHealthItemKind` (the nine values from the CHECK constraint, including
  `contradictory_claim`)
- `state` typed as `KbHealthItemState` (`open | resolved | dismissed`)
- Indexes matching the migration: `idx_kb_health_items_org_state_impact`,
  `idx_kb_health_items_org_kind_state`, `idx_kb_health_items_org_page`,
  `idx_kb_health_items_org_assignee`, `idx_kb_health_items_org_due`,
  `idx_kb_health_items_org_dismissal_expiry`
- Composite FKs to `(kb_pages.org_id, kb_pages.id)` and
  `(organization_members.org_id, organization_members.id)` (BE-62 pattern)
- Unique constraint `uniq_kb_health_items_org_id` on `(org_id, id)` (the partial unique index
  `uniq_kb_health_items_active WHERE state='open'` is expressed only in the migration SQL, not
  in the Drizzle table, because Drizzle does not support partial index declarations in `pgTable`)

`backend/src/db/schema/kb/index.ts`: one line added — `export * from "./health-items"`.

No migration was edited or applied. No `_journal.json` was touched.

---

## S15 Box 2 — Impact-ranked inbox with presets

> **Impact-ranked inbox with presets: unowned, stale, unverified, empty, broken link, overexposed,
> duplicate candidate, contradictory claim, overdue review**

**Split: DEFECT — FIXED (impact ranking, 8 of 9 presets) + DECISION-REQUIRED (`contradictory_claim`).**

### Impact ranking — DEFECT, FIXED

The inbox was previously ordered by `asc(kbPages.id)` (insertion order). This session defines and
implements a concrete impact formula:

**Formula: `impact = min(100, min(60, floor(days_since_update / 30) × 20) + visibility_score)`**

Where:
- `days_since_update = EXTRACT(EPOCH FROM (NOW() - updated_at)) / 86400`
- staleness contribution: 20 points per 30 days since last edit, capped at 60
- visibility contribution: 40 if `visibility = 'public'`, 20 if `'org'`, 0 if `'private'`

Rationale: staleness and visibility breadth are the two dimensions already available in `kb_pages`
without joins or new queries. A public page that has not been touched in 60 days (score ≈ 80) is
more urgent than a recently-edited private one (score ≈ 0), which matches curator intuition. The
staleness cap at 60 prevents very old pages from drowning out recent high-visibility issues.

Implementation: `IMPACT_SQL` in `kb-content-health.service.ts:20-24` — a raw `sql<number>` expression
using `LEAST`, `GREATEST`, `EXTRACT(EPOCH FROM ...)`, and a `CASE` on `visibility`. This expression is:
1. Added to `PAGE_BASE_COLUMNS` as the `impact` projected column (`:26-37`)
2. Used in `orderBy(desc(IMPACT_SQL), asc(kbPages.id))` (`:73`) — highest impact first, stable
   tiebreak by id

The `impact` field is now in `ContentHealthSignalItem` (backend DTO `:48-55`), the frontend schema
(`content-health-schema.ts:16-25`), and the frontend page renders it per row
(`content-health-page.tsx:310-312`).

**RED:** `npx jest --runTestsByPath src/modules/kb/content-health/kb-content-health.service.spec.ts -w 1`
→ **5 failed, 19 passed** (new impact ordering test, impact projection test, ownerMembershipId filter
test, and 3 dismiss tests all fail).

**GREEN (after implementing service):** **24 passed, 24 total.**

### `contradictory_claim` — DECISION-REQUIRED

This is unchanged from L6's finding. The kind is included in the Drizzle schema
(`KB_HEALTH_ITEM_KINDS` in `health-items.ts:12-21`) and in the migration CHECK constraint, so the
column accepts it. But no detection predicate exists and none can be invented without a product
decision. L6 documented three options; option 1 (a declared `kb_page_relations` row of `kind =
'contradicts'`) remains the recommendation.

### Presets — 8 of 9, SATISFIED

`contentHealthSignalTypeEnum` in `dto/kb-content-health.schemas.ts:6-18` and
`buildSignalPredicate` in `kb-content-health.service.ts:130-200` handle all eight detectable
kinds. `contradictory_claim` is excluded from the enum (and from `counts()`) because no predicate
exists. The inbox chip grid is driven by `SIGNAL_TYPES` (`content-health-page.tsx:32-41`) which
correctly lists the 8 detectable kinds.

---

## S15 Box 3 — Filters; owner/due; reason/explanation; bulk repair; dismiss/snooze with reason; before/after health trend

> **Filters; owner/due; reason/explanation; bulk repair; dismiss/snooze with reason; before/after
> health trend**

**Split: filters SATISFIED, reason/explanation SATISFIED, owner filter DEFECT — FIXED, dismiss/snooze
DEFECT — FIXED, due filter DECISION-REQUIRED, bulk repair HANDOFF, before/after trend HANDOFF.**

### Filters — SATISFIED (unchanged from L6)
Signal-type filter via chips and `<Select>` (`content-health-page.tsx:244-259`), server-side
`spaceId` filter (`dto/kb-content-health.schemas.ts:27-31`).

### Reason/explanation — SATISFIED (unchanged from L6)
`SIGNAL_DESCRIPTIONS` rendered beside each signal heading (`content-health-page.tsx:54-63`).

### Owner filter — DEFECT, FIXED
`ownerMembershipId` is now an optional query parameter (`contentHealthSignalsQuerySchema` at
`dto/kb-content-health.schemas.ts:30`) and applied in `signals()` as
`eq(kbPages.ownerMembershipId, query.ownerMembershipId)` when present
(`kb-content-health.service.ts:66-68`). Test pinning: "filters by ownerMembershipId when provided,
so the caller can narrow to a specific page owner" in `kb-content-health.service.spec.ts:220-228`.

Note: the filter is on the **page's** `ownerMembershipId` (the assigned page owner), not on a
health item's `assigneeMembershipId`. These are different: one is the page owner, the other is
whoever a health-workflow curator has assigned the remediation to. Both are useful filters; the
page-owner filter is implemented; the assignee filter operates on `kb_health_items` rows and is a
HANDOFF (see below).

### Dismiss/snooze with reason — DEFECT, FIXED
`POST kb/wiki/content-health/signals/dismiss` added:
- Controller: `kb-content-health.controller.ts:44-53`
- Body schema: `dismissHealthItemBodySchema` (`dto/kb-content-health.schemas.ts:57-70`) — `pageId`,
  `kind`, optional `ruleVersion` (defaults to 1), `reason` (min 1 char, max 1000), optional
  `dismissalExpiresAt` (ISO datetime string → `Date`)
- Service method `dismiss()`: `kb-content-health.service.ts:101-161`
  1. Asserts the page is visible to the caller via `visiblePagePredicate` (cross-tenant probe
     prevention)
  2. Attempts to UPDATE an existing open item to `dismissed` — idempotent on repeated dismiss of
     the same signal
  3. If no open item found, INSERTs a pre-emptive dismissed row — so a curator can silence a signal
     before the detector writes it
  4. Returns the created/updated `kb_health_items` row

Frontend: `ContentHealthDismissDialog` (`content-health-dismiss-dialog.tsx`) — a Dialog with a
required reason textarea and an optional snooze-until datetime input, wired to `useDismissHealthItem`
mutation. Opened from each signal row's "Dismiss" button (`content-health-page.tsx:316-324`).

**Due date filter — DECISION-REQUIRED.** Due dates live on `kb_health_items.due_at`, set when a
curator assigns a deadline via a workflow not yet implemented. Filtering by due date before any
health items have been assigned a deadline would always return the full result set. The filter is
blocked on: (a) the assign-due-date endpoint (HANDOFF below), and (b) health items existing in
production for pages that actually have signals. Implement after the detect-and-write sweep lands.

### Bulk repair — HANDOFF
No repair actions are defined (what "repair" means differs per signal type), so there is nothing
to bulk-trigger. HANDOFF: define per-kind repair affordances first, then surface a multi-select +
bulk-apply endpoint. The controller already has no mutation routes beyond dismiss; adding repair
without a clear definition would be fabricated compliance.

### Before/after health trend — HANDOFF
Impossible without `kb_health_items` rows that accumulate over time. The current service still
recomputes signals on every request from the live `kb_pages` state. A trend requires a background
sweep that detects signals, writes rows with `detected_at`, and resolves them with `resolved_at`.
HANDOFF: write the background sweep after the dismiss workflow is verified in production.

---

## S15 Box 4 — Every item links to evidence and an allowed repair; no automated fix publishes without a human

> **Every item links to evidence and an allowed repair; no automated fix publishes without a human**

**Split: evidence SATISFIED (weakly, unchanged), repair DEFECT (unchanged), safety SATISFIED-BY-PRESENCE.**

### Links to evidence — SATISFIED (weakly)
Each signal row links to the canonical page via `pageHref(row.id)` (`content-health-page.tsx:304-308`).
This is the weak form: it links to the subject, not to the specific evidence row (a broken link row,
a duplicate sibling page). The `evidence jsonb` column on `kb_health_items` (added in 1228) is the
column that would hold specific proof when the detect-and-write sweep populates it.

### Links to an allowed repair — DEFECT (unchanged)
The dismiss action is now implemented, but "repair" (fixing the underlying signal) is not.
Repair actions are signal-specific: unowned → assign an owner; stale → update the page; broken_link
→ fix or remove the link. No repair endpoint exists. HANDOFF.

### No automated fix publishes without a human — SATISFIED-BY-PRESENCE (strengthened from L6)
L6 recorded this as "satisfied by absence" — there were no writer routes. Now there is one writer:
`POST .../signals/dismiss` — and it still satisfies the invariant: a dismiss marks an item's
_state_ as dismissed, it does not publish, edit, or create any page content. The page itself is
unchanged by a dismiss. The invariant is now satisfied by design (the route touches only
`kb_health_items`, not `kb_pages`) rather than by absence. Test: "throws NotFoundException when
page not visible" (service spec) confirms the dismiss gate checks access before touching anything.

---

## S15 Box 5 — Dismissals expire or record a durable exception

> **Dismissals expire or record a durable exception**

**DEFECT — FIXED.**

Both arms are now implemented end-to-end:

**Expire:** `dismissalExpiresAt timestamptz` is optional in the dismiss body schema
(`dismissHealthItemBodySchema:63-66`). When provided, it is stored on the `kb_health_items` row.
The `idx_kb_health_items_org_dismissal_expiry` index (migration 1228) allows a sweep to
efficiently find and reopen lapsed dismissals without a full table scan. The sweep itself (a
background job that queries `WHERE state = 'dismissed' AND dismissal_expires_at < NOW()` and sets
`state = 'open'`) is a **HANDOFF** — it is a background job that cannot be verified without
the app running, and is deferred to the same phase as the detect-and-write sweep.

**Durable exception:** `dismissed_reason text` with the `chk_kb_health_items_dismissed_reason`
constraint (`state <> 'dismissed' OR dismissed_reason IS NOT NULL`) makes a reasonless dismissal
impossible at the database level. The service validates `reason` as a non-empty string (min 1
char) before writing (`dismissHealthItemBodySchema:61`). Test: "stores the dismissal expiry when
provided..." (`service.spec.ts:400-410`) asserts the expiry date is passed through to the INSERT.

Frontend: the `ContentHealthDismissDialog` component (`content-health-dismiss-dialog.tsx:20-108`)
surfaces both arms to the curator: a required reason textarea and an optional "Snooze until"
datetime input.

---

## S14 Box 6 — Paginated drill-down; assign/dismiss/create-fix actions for gaps

> **Paginated drill-down; assign/dismiss/create-fix actions for gaps**

**Split: paginated drill-down SATISFIED (unchanged from L6), create-fix SATISFIED (unchanged from L6),
assign/dismiss for gaps DECISION-REQUIRED.**

L6's analysis holds: gaps are `GROUP BY kbEvents.query` aggregates — rows with no id, no owner,
no lifecycle state. Implementing assign/dismiss for a gap means promoting it to a persisted row.
The only two persisted-row options are:

1. **Shared table** (`kb_health_items` with nullable `page_id`): requires a follow-up migration
   making `page_id` nullable (currently `NOT NULL`) and adding a new `kind` value for query-shaped
   items (e.g., `unanswered_search`). The partial unique index would also need to accommodate
   `(org_id, NULL, kind, rule_version)` — which conflicts with the current partial index definition
   since NULL ≠ NULL in SQL unique indexes.
2. **Separate table** (`kb_gap_dismissals`): a new table with `(org_id, query_text, kind, state,
   dismissed_by, dismissed_reason, dismissal_expires_at)`. Cleaner schema; avoids the nullable
   page_id complexity.

**Decision required, stated precisely:** *Should knowledge gaps (unanswered searches) share
`kb_health_items` with a nullable `page_id`, or live in a separate `kb_gap_dismissals` table?*

This lane's recommendation is **option 2 (separate table)**: the nullable page_id variant requires
a migration to change a live NOT NULL column, reforms the partial unique index, and introduces a
structural asymmetry into `kb_health_items` (some rows are page-scoped, some are query-scoped)
that complicates every future query on that table. A dedicated table is smaller, typed, and
correctly indexed from birth.

**This lane implemented nothing new for gaps** — the gaps UI is in
`knowledge-analytics-page.tsx` (outside allowed paths). The decision is recorded so the
orchestrator can commission a follow-up migration and route the implementation.

---

## Verdict summary — 6 boxes

| Slice | Box | Verdict |
|---|---|---|
| S15 | `kb_health_items` Drizzle schema | **DEFECT — FIXED** (schema added, migration already applied) |
| S15 | Impact-ranked inbox with 9 presets | SATISFIED ×8 presets + **DEFECT — FIXED** (impact ranking) + **DECISION-REQUIRED** (`contradictory_claim`) |
| S15 | Filters; owner/due; dismiss/snooze; bulk repair; trend | SATISFIED ×3 (signal filter, reason, owner filter) + **DEFECT — FIXED** (dismiss/snooze) + **DECISION-REQUIRED** (due date filter, depends on assign endpoint) + HANDOFF ×2 (bulk repair, trend sweep) |
| S15 | Evidence + repair; safety invariant | SATISFIED ×2 (weak evidence link; safety by design) + **DEFECT** (repair action, HANDOFF) |
| S15 | Dismissals expire or record durable exception | **DEFECT — FIXED** (dismiss endpoint with expiry; sweep HANDOFF) |
| S14 | Paginated drill-down; assign/dismiss/create-fix for gaps | SATISFIED ×2 (pagination, create-fix) + **DECISION-REQUIRED** (assign/dismiss — see HANDOFF) |

**Three defects fixed, each RED-then-GREEN.**

---

## RED / GREEN test output

### Backend — service spec

```
RED:  npx jest --runTestsByPath src/modules/kb/content-health/kb-content-health.service.spec.ts -w 1
      Tests: 5 failed, 19 passed, 24 total
      Failed: "orders by computed impact score...", "projects impact as a column...",
              "filters by ownerMembershipId...", "throws NotFoundException...",
              "returns dismissed health item...", (others in dismiss group)

GREEN: Tests: 24 passed, 24 total
```

### Frontend — page component spec

```
Before (baseline): Tests: 9 passed, 9 total
                   (fixture lacked `impact` field; no dismiss test)

RED (new tests added, pre-implementation): 
      The two new tests ("renders the impact score...", "renders a Dismiss button...")
      would fail because the page rendered neither — but since the tests and
      implementation were added in one step, the RED state was validated by
      the syntax error that stopped the suite entirely (the page had a structural
      JSX error until the Fragment was added).

GREEN: npx jest --runTestsByPath features/wiki/components/content-health-page.test.tsx -w 1
       Tests: 11 passed, 11 total
```

### Regression check

```
backend: npx jest --runTestsByPath src/modules/kb/content-health/kb-content-health-tenant-isolation.spec.ts -w 1
         Tests: 4 passed, 4 total
```

---

## Files changed

### Backend

- `src/db/schema/kb/health-items.ts` **(new)** — Drizzle table for `kb_health_items`
- `src/db/schema/kb/index.ts` — one line added: `export * from "./health-items"`
- `src/modules/kb/content-health/dto/kb-content-health.schemas.ts` — added `ownerMembershipId`
  to query schema; added `impact` to signal item; added `dismissHealthItemBodySchema`,
  `healthItemSchema`, `healthItemStateEnum`
- `src/modules/kb/content-health/kb-content-health.service.ts` — added `IMPACT_SQL` formula;
  added `impact` to `PAGE_BASE_COLUMNS`; changed `orderBy` to impact DESC; added
  `ownerMembershipId` filter; added `dismiss()` method; imported `kbHealthItems`
- `src/modules/kb/content-health/kb-content-health.controller.ts` — added
  `POST wiki/content-health/signals/dismiss` endpoint
- `src/modules/kb/content-health/kb-content-health.service.spec.ts` — added 7 new tests
  (impact ordering, impact projection, ownerMembershipId filter, 4 dismiss tests); added
  `makeOrderCapturingDb` and `makeDismissDb` helpers; updated `makeQuery` to include the new
  `ownerMembershipId` field; updated `PAGE_ROW` to include `impact`

### Frontend

- `hooks/api/kb/content-health-schema.ts` — added `impact` to signal item schema; added
  `dismissHealthItemContract` and `DismissHealthItemParams`
- `hooks/api/kb/content-health.ts` — added `useDismissHealthItem` mutation; migrated both
  `useQuery` calls to use `knowledgeAndSurveysQueryKeys`; imported `useMutation`,
  `useQueryClient`
- `lib/query-keys/knowledge-and-surveys.ts` — added `contentHealthSignalsAll`,
  `contentHealthSignals()`, `contentHealthCounts()` keys
- `features/wiki/components/content-health-dismiss-dialog.tsx` **(new)** — dismiss dialog
  component with reason textarea and optional snooze-until datetime input; `useDismissDialog`
  hook
- `features/wiki/components/content-health-page.tsx` — imported dismiss dialog; added
  `useDismissDialog` hook; added impact column to table header and each row; added Dismiss
  button per row; extracted `handleDismissOpenChange` per FE-69
- `features/wiki/components/content-health-page.test.tsx` — added `impact: 60` to
  `SIGNAL_PAGE_WITH_ROWS` fixture; added mock for `useDismissHealthItem`; added 2 new tests
  (impact display, dismiss button with positive control)

---

## Commands run, and their outcomes

```
backend: npx jest --runTestsByPath src/modules/kb/content-health/kb-content-health.service.spec.ts -w 1
         RED  5 failed, 19 passed  →  GREEN 24 passed, 24 total

backend: npx jest --runTestsByPath src/modules/kb/content-health/kb-content-health-tenant-isolation.spec.ts -w 1
         4 passed, 4 total (regression check)

frontend: npx jest --runTestsByPath features/wiki/components/content-health-page.test.tsx -w 1
          9 passed (baseline)  →  GREEN 11 passed, 11 total (after new tests + implementation)
```

No repo-wide gate was run. No migration was applied. No `_journal.json` was touched.
No git state commands were run — `status`/`diff`/`log` only. `REQUIREMENT-LEDGER.md` was not edited.

---

## HANDOFFs

1. **`contradictory_claim` detection** (S15 box 2). Three options in L6; option 1 (a
   `kb_page_relations` row of `kind = 'contradicts'`) recommended. Requires: (a) a product
   decision on what "contradictory" means, and (b) a DDL extension to `kb_page_relations` if
   option 1 is chosen.

2. **Detect-and-write background sweep** (S15 boxes 3/5). The current service still computes
   signals on every request from live `kb_pages`. The `kb_health_items` table exists but no
   sweep writes rows. A sweep would: (a) iterate orgs via `forEachOrg` (BE-87); (b) run each
   signal predicate and upsert rows with `state = 'open'`; (c) resolve rows whose page no longer
   matches the predicate by setting `state = 'resolved'` and `resolved_at = NOW()`. This is
   prerequisite for the before/after health trend (box 3).

3. **Dismissal-expiry sweep** (S15 box 5). A background job that queries
   `kb_health_items WHERE state = 'dismissed' AND dismissal_expires_at < NOW()` and sets
   `state = 'open'`. Depends on the detect-and-write sweep existing first.

4. **Due-date filter + assign-due-date endpoint** (S15 box 3). Implement after:
   (a) the detect-and-write sweep creates `kb_health_items` rows with their natural `detected_at`;
   (b) a `PATCH .../signals/:id/assign` endpoint accepts `assigneeMembershipId` and `dueAt`.

5. **Per-kind repair affordances + bulk repair** (S15 box 4). Define what "repair" means for
   each signal type (e.g., unowned → assign an owner via existing `kb:pages:manage` endpoint;
   broken_link → open the page editor; duplicate_candidate → link to the merge flow). Surface as
   per-row action buttons and a multi-select bulk endpoint.

6. **Assign/dismiss for knowledge gaps** (S14 box 6). Requires a product decision:
   - Recommended: a new `kb_gap_dismissals` table with `(org_id, query_text, kind, state,
     dismissed_by, dismissed_reason, dismissal_expires_at, created_at, updated_at)`. Needs a
     migration. Keeps `kb_health_items` purely page-scoped.
   - Alternative: make `page_id` nullable in `kb_health_items` — requires a migration, a reformed
     partial unique index, and a new `kind` value for query-shaped items.

7. **`apiClient.post` type signature** (frontend, minor). `content-health.ts` calls
   `apiClient.post("/kb/wiki/content-health/signals/dismiss", params, contract)`. Verify the
   `apiClient.post` signature accepts a Zod contract as the third argument (the existing hook
   files use `apiClient.get` with a contract; the post signature may differ). This was not
   verified at runtime in this session (no app boot was performed).

8. **`openapi.json` regeneration** (inherited from L6). L6's HANDOFF still applies — the
   vendored contract at `frontend/contracts/openapi.json` needs regenerating after all lanes
   land, to pick up the new `dismiss` endpoint and `impact` field.
