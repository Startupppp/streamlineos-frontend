# Architecture review — point-by-point coverage

One entry per card in the two 2026-09-26 HTML reports. Opened 2026-09-29 to answer a single
question per point: **is this implemented, and what proves it?**

Sources:
- `architecture-review-20260926-213335.html` — "Architecture review — StreamlineOS Build module" → cards **A0–A12**
- `architecture-review-20260926-230544.html` — "Build module — architecture review" → cards **B1–B12**

The 68 numbered tickets in this directory remain the unit of work. This file is the index over the
*reports*, because ticket numbering is not report provenance (the README says so) and because a
ticket's `**Status:**` header has repeatedly gone stale while its boxes were accurate.

## Rules for this file

- A box is checked only when the change exists **and** a command was run that would fail without it.
- Every checked box names the evidence: a path, a gate, or a test command with its result.
- "Verified by code read" is not a checked box. It is a note.
- A decision to *not* do something is recorded as **DECIDED**, never as a checked box.
- Claims by an agent are leads. The orchestrator confirms against source before checking.

## Status legend

| Mark | Meaning |
|---|---|
| **DONE** | implemented and verified by a run |
| **PARTIAL** | core landed, named remainder open |
| **OPEN** | not implemented |
| **DECIDED** | deliberately not doing it, reason recorded |

---

## Summary

| Card | Subject | Status |
|---|---|---|
| A0 | CCG-1 premise was false | DONE |
| A1 | Require the concurrency token | PARTIAL — stage one done, stage two is an owner decision |
| A2 | Roadmap cursor matches its ORDER BY | DONE |
| A3 | Column-count key is a real prefix | DONE |
| A4 | Enum contracts derive from the catalog | DONE |
| A5 | Activity-action contract opened | DONE |
| A6 | Assignee filter from members | DONE |
| A7 | Index-usable ticket predicates | PARTIAL |
| A8 | Collapse the project-access waterfall | DONE |
| A9 | `core/` structure, pass-throughs deleted | DONE |
| A10 | Narrow report invalidation | DONE |
| A11 | Deletion candidates | DECIDED + DONE |
| A12 | Deep-import the data layer | DONE |
| B1 | RLS on three Build tables | DONE |
| B2 | One reachability definition | DONE |
| B3 | Every ticket write bumps `version` | DONE |
| B4 | One outbox aggregate-version scale | DONE |
| B5 | Status group reaches the client | DONE |
| B6 | No 200 over a rolled-back write | DONE |
| B7 | `applyTicketChange` owns the effect set | PARTIAL |
| B8 | Roadmap keyset seam is called | DONE |
| B9 | One Build list surface | DONE |
| B10 | Search reaches the read contract | PARTIAL — views done, 7 minor pages left |
| B11 | Gates stop over-reporting coverage | DONE |
| B12 | Schema-enforced invariants | DONE |
| X1 | `check:type-assertions` is red | DONE |

---

## A0 — CCG-1's premise was false and was blocking work

**DONE.** The review showed CCG-1 claimed "no optimistic concurrency anywhere" on the strength of an
`if-match|etag` grep that could not see a body-carried token.

- [x] `docs/build-module/99-cross-cutting-gaps.md` carries the dated correction and reopens what the
      false premise had closed — read 2026-09-29, the "Corrected 2026-09-27" block is present.
- [x] Open question 11 retired from `99-open-questions.md`; ticket 68 records it.

## A1 — Require the concurrency token the code already checks

**PARTIAL by design.** The main route requires the token. The four siblings now accept and enforce
it when given, which is stage one of the review's own staged rollout. Making it mandatory is stage
two and is an owner decision, not an oversight.

- [x] `version` is no longer `.optional()` on ticket update — `backend/src/modules/build/core/dto/ticket.schemas.ts:183`.
- [x] The 409 returns the current value — `core/tickets/ticket-version-conflict.exception.ts:6-11` sets
      `code: "PROJECTS_TICKET_CONFLICT"`, `details: { currentVersion }`.
- [x] **Stage one — the four sibling routes accept and enforce a token when given** (commit `47482aa55`).
      `rankTicketSchema`, `bulkUpdateSchema`, `updateBugSchema` and `toggleVisibilitySchema` each gained
      an optional token and compare-and-swap only when the caller supplies one, reusing
      `TicketVersionConflictException` so the 409 body matches the main route.
      Bulk takes a **per-row** `versions` map — a single per-request version cannot detect that
      ticket A moved while ticket B did not, so it would protect nothing.
      Each route has a test asserting **omitting the token still succeeds**. 29 tests, all pass.
- [ ] **Stage two — make the token required.** Deliberately NOT done. This is a breaking change and
      the backend deploys to production on push: requiring it on the rank route breaks drag-and-drop
      for any client not yet sending one. The review prescribed exactly this staging
      ("accept-and-warn, then require"). Flip it once clients send the token — it is one line per schema.
      **Owner decision.**

## A2 / B8 — The roadmap cursor matches its ORDER BY

**DONE.** The correct implementation already existed in the same file and was dead.

- [x] `buildRoadmapOrdering` / `decodeRoadmapCursor` / `RoadmapOrdering` are called from `listRoadmap`
      — `core/roadmap/projects-roadmap.service.ts:270-272`, ordering applied at `:310`.
- [x] A cursor from a different sort is rejected, not misapplied — `cross_sort` branch throws
      `BadRequestException` at `:273-276`.
- [x] Per-mode boundaries replace the unconditional `Number()` parse; title mode compares as string (`:207-219`).

## A3 — The column-count key is a genuine prefix

**DONE.**

- [x] `frontend/lib/query-keys/build-work.ts:306-309` omits the trailing element when there are no
      filters, so the 4-segment key is a true prefix of the 5-segment filtered key.
- [x] Both invalidation sites call it argument-less — `hooks/api/build/ticket-cache.ts:217,283`.

## A4 — Enum contracts derive from the generated catalog

**DONE.**

- [x] All 8 approval entity types are selectable — `frontend/features/build/approvals/approvals-schema.ts:19,22`
      uses `DB_ENUMS.approval_entity_type`.
- [x] The phantom `SUBTASK` is gone; `ticketTypeEnum` is `["EPIC","STORY","TASK","BUG"]` and the DTO
      derives from it — `core/dto/ticket.schemas.ts:142,170`.
- [x] Response schemas across cycles, modules, epics, governance, meetings, forms, teams and whiteboards
      derive from their pgEnums (commit `4b837c21d`); frontend mirrors via `DB_ENUMS` (commit `df1148cf5`).
- [x] `pnpm check:contract-parity` → PASS (2026-09-29).
- [x] `tickets.status` and `projects.priority` deliberately left `z.string()` — both are `text`
      columns, not enums, because Build supports org custom states (`migrations/0371`).

## A5 — The activity-action contract is open, closed only for display

**DONE.**

- [x] The parse contract is `action: z.string()` — `frontend/hooks/api/build/build-tickets-core-schema.ts:293`.
- [x] The 14-value union survives as a display type with a fallback —
      `features/build/tickets/ticket-activity-log.tsx:52-61` (`isKnownAction` guard, generic icon otherwise).

## A6 — Assignee filter sourced from members

**DONE.**

- [x] `all-work-page.tsx` feeds the filter from `useBuildMembers()`, not `allProjects.flatMap(p => p.members)`;
      no `flatMap` remains in the file. Server-filtered, keyset-paginated (`hooks/api/build/build-members.ts:38-66`).
- Note, not a defect: the assignee input does not yet wire the debounced-search pattern from
  `ticket-combobox.tsx:30`. UX polish only — the invisibility bug is closed.

## A7 — Index-usable ticket predicates

**PARTIAL.**

- [x] The `OR`+semi-join is a top-level `UNION ALL`, issued via `db.execute`, in both copies —
      `core/tickets/projects-tickets-read.service.ts:315-335,470-489` behind the shared
      `core/tickets/assignee-filter.ts`. Specs assert `UNION ALL` present and `EXISTS` absent.
- [x] Mention lookup uses an id-only function, not a leading-wildcard ILIKE —
      `core/activity/projects-activity.service.ts:386` calls `app.search_mention_user_ids`.
- [x] The activity log carries `project_id` with a partial index —
      `db/schema/build/activity.ts:39,49`; the feed filters on it directly.
- [x] The approvals-inbox cursor no longer falls back to `lt(id, cursorId)` alone —
      `approvals/build-approvals-inbox.service.ts:19-29` requires both parts or applies no boundary.
- [ ] **~16 leading-wildcard ILIKE sites remain** against trigram indexes that are dead under RLS
      (BE-49, BE-80). `app.search_*_ids` covers 4 tables; these are not among them:
      `client-portal/change-requests.service.ts:133`, `core/customers/projects-customers.service.ts:36`,
      `core/members/build-members.service.ts:34-37`, `execution/cycles.service.ts:54`,
      `execution/epics.service.ts:39`, `managed-products/managed-products.service.ts:95`,
      `portfolios/portfolios.service.ts:87`, `qa/bugs.service.ts:35`,
      `qa/test-management.service.ts:163`, `teams/team-members.service.ts:50-52`, `teams/teams.service.ts:61`.
- [ ] **`idx_project_approvals_approver_status` cannot supply the order.** It is
      `(org_id, approver_membership_id, status)` with no trailing `created_at, id`, while the read
      orders by `(created_at DESC, id DESC)` — `db/schema/build/approvals.ts:50`. Correctness is fine;
      the sort is not index-served. **Unmeasured** — no `EXPLAIN` was run, every connection string
      here points at production.

## A8 — Collapse the project-access waterfall

**DONE.** Closed 2026-09-29.

- [x] `resolveProjectAccess` batches to 2 round trips (project+perms parallel, then members+teams
      parallel) — `core/project-crud/project-access.ts:83-163`.
- [x] `getProject` no longer re-implements the cascade; it calls `resolveProjectAccess` and preserves
      the `PROJECTS_NOT_FOUND` 404 body — commit `4b837c21d`, spec `projects-query-get-project.spec.ts`.
- [x] **One access resolution per request** (commit `47482aa55`). `getOrCreateRequestCache()` holds one
      `ProjectAccessCache` per request in a `WeakMap` keyed on the `AsyncLocalStorage` tenant-context
      object, so `listTickets` and `getColumnCounts` share it instead of each building a fresh one.
      A rejected lookup is evicted rather than cached, and the inner key still carries
      `orgId:userId:projectId`, so a reused context object could not bleed across tenants.
      A request-scoped Nest provider was rejected: it forces every injector up the chain to become
      request-scoped. 22 tests including "compute called once within one context" paired with
      "compute called twice across two contexts".

## A9 — `core/` has a structure and the pass-throughs are gone

**DONE.**

- [x] `core/` is 20 concept subdirectories with a curated `core/index.ts` barrel; only 12 files remain flat.
- [x] `phase-2/` renamed for what it protects — `consolidation-guards/` and `qa/bug-consolidation/` (commit `6927bcd1e`).
- [x] Claimed pass-throughs re-read against BE-143: the survivors bind an argument or adapt a shape,
      which BE-143 exempts. The one genuinely dead wrapper, `rebalanceProjectRanks`, is deleted (commit `4b837c21d`).
- Note: `projects.module.ts` is still a large aggregator (~18 controllers, ~44 providers). Recorded, not ticketed.

## A10 — Narrow the report invalidation, raise the stale floor

**DONE.**

- [x] Invalidation is gated per changed field — `frontend/hooks/api/build/ticket-cache.ts:281-361`.
      A title-only edit invalidates no reports.
- [x] All six report hooks declare `staleTime: 2 * 60_000` — `hooks/api/build/reports.ts:133,149,160,171,181,191`.
- [x] The rename path invalidates `projects.detail/members/list()`, not `projects.all` — `hooks/api/build/projects.ts:216-225`.
- Known design gap, tracked in ticket 19: rank and title edits still bump `updatedAt`, which some
  backend report projections read. Not a frontend cache-key defect.

## A11 — Deletion candidates

**DECIDED + DONE.**

- [x] **DECIDED — the sprint 410 tombstone stays.** `execution/sprints.service.ts` returns 410 with
      the migration hint; deleting it would turn that into a silent 404 for third-party and MCP
      consumers. Ticket 31 records the decision. This is the review's own open question, answered.
- [x] `GET /build/resource-allocation` was already removed; the stale mock key is gone (commit `4b837c21d`).
- [x] `BUG_COLUMN_DISPOSITIONS` moved out of the production module — ticket 34.
- [x] Both false positives honoured: `activeSprintSchema` is live on `GET /dashboard/active-sprint`
      (`modules/dashboard/dashboard.controller.ts:42,79`) and the empty-allowlist guard specs are retained.

## A12 — Deep-import the data layer

**DONE.**

- [x] Codified as **FE-127** in `frontend/CLAUDE.md`.
- [x] Gate `frontend/hooks/api/build/aggregate-import-boundary.test.ts` → ran 2026-09-29, 5/5 pass.
- [x] `features/build/**` is a hard zero; only a `.test.tsx` and a `test-harness.tsx` reach the barrel,
      both explicitly permitted. Ratchet `aggregate-import-known.json` holds 45 entries, shrink-only.

## B1 — RLS on the three Build tables

**DONE.** The review's top recommendation.

- [x] `migrations/1390_rls_project_updates.sql`, `1391_rls_project_attachments.sql`,
      `1392_rls_managed_product_memberships.sql` each `ENABLE ROW LEVEL SECURITY` and create
      `tenant_isolation` qualified `org_id = app.current_org_id()`, copied from `1163`.
- [x] All three journalled — `migrations/meta/_journal.json`, idx 1132-1134.
- [x] Proved as `streamline_app` with `rolbypassrls = false`: own-tenant rows visible, other-tenant
      returns 0 rows, **GUC absent raises 42501** — the case that matters. Recorded in ticket 30.
- [x] Neither sweep could ever have caught these: `0378` is bounded to `nspname='public'`, `0988`
      is hand-enumerated. Confirmed by reading both.

## B2 — One definition of "which projects can this actor reach"

**DONE.**

- [x] `checkProjectAccess` no longer exists; callers use `resolveProjectAccess` (111 sites via
      `assertProjectAccess`). Its dead mock stubs are deleted.
- [x] `assertProjectInOrg` has one definition — `core/project-crud/project-access.ts:17`;
      `roadmap-references.ts` imports it.
- [x] The drift spec is gone, because there is nothing left for it to compare.
- [x] **`reachableProjectsSql` now applies the ACTIVE-membership filter** on both the direct-member
      and team branches, matching the canonical helper — commit `4b837c21d`. Previously a suspended
      member stayed reachable through `work-query` and `scope-directory` while the canonical helper
      denied them. Spec: `reachability/project-reachability.spec.ts`.
- [x] `memberProjectIds` gained the manager and team branches, so team-only access no longer opens a
      project with its entity cards empty — `entity/build-entity-reads.service.ts`, spec
      `build-entity-reads-member-project-ids.spec.ts`.
- [x] `npx jest` over tickets/project-crud/entity/reachability/activity/releases → **92 suites, 603 tests, all pass**.

## B3 — Every ticket write bumps `version`

**DONE.**

- [x] `migrations/1373_tickets_version_trigger.sql` — `BEFORE UPDATE ON build.tickets` sets
      `NEW.version := OLD.version + 1`. Journalled. Fixes all writers at once, including future ones.
- [x] `migrations/1395_sibling_version_columns.sql` extends the same shape to cycles, milestones,
      modules, roadmap items and releases.
- [x] `updateEpic` — the review's named offender — now does a real CAS and filters `isNull(deletedAt)`
      (`execution/epics.service.ts:133-161`).
- [x] `check:ticket-write-module` gate exists with a ratchet listing the writers that bypass the change module.
- Note: 12 ratcheted writers still write without a read-then-CAS. The counter is never stale (the
  trigger guarantees that), but those callers cannot detect a concurrent business-field edit.
  Shrinking the ratchet is ongoing work, not a reopening of this card.

## B4 — One outbox aggregate-version scale

**DONE.**

- [x] Both ticket producers emit the row-derived version — `core/tickets/apply-ticket-change.ts:304`
      and `build-ticket-batch-workflow.ts` via the bulk mutation's `.returning({id, version})`.
- [x] Pinned by `ticket-status-event-version-scale.spec.ts`, which asserts the value never enters the
      epoch-millisecond range.
- [x] The watermark left behind by the old scale was remediated — `migrations/1398`, applied.
- [x] **The release producer had the same defect and is fixed** — `core/releases/projects-releases.service.ts:171`
      now emits `row.rowVersion` (from migration `1395`'s column and trigger) instead of `Date.now()`.
      New spec `projects-release-published-event-version-scale.spec.ts` failed first with
      `Expected: 7, Received: 1790651715127`, then passed. Only one producer emits for this aggregate,
      so the collision was latent rather than active.

## B5 — The status group reaches the client

**DONE.**

- [x] The backend DTO declares it — `core/dto/build-project-detail-response.schemas.ts:21`,
      `type: z.enum(DB_ENUMS.state_group).nullable()`.
- [x] The frontend contract declares it — `hooks/api/build/build-project-schema.ts:105`.
- [x] So `shared/completed-status.ts` can return more than `{"DONE"}`, and "hide completed" works for
      a custom `Shipped` or `Released`.
- The review's sub-claim that `schema-diff.mjs` compares "field presence only" is **refuted**: it has
  compared scalar types, enum values and nullability since commit `f7ad5f322` (2026-09-17), which
  predates the review. Recorded so the next reader does not re-derive it.

## B6 — No 200 over a rolled-back write

**DONE.**

- [x] Five sites that wrapped a DB-writing effect in a bare `.catch` now run inside a savepoint via
      `withSavepoint`: `apply-ticket-change.ts:334,346`, `projects-activity.service.ts:468`,
      `projects-tickets-create.service.ts:229`, `projects-provision.service.ts:143`.
- [x] `withSavepoint` also swaps the ambient tenant context, so a nested service's `this.db` resolves
      to the savepoint rather than the outer transaction — `modules/data-quality/savepoint.ts:28-35`.
      Without that swap the isolation would be apparent, not real.
- [x] Four new savepoint specs; failing first (0 calls where ≥1 expected), then passing. Suite green.
- [x] The review-notification emit at `apply-ticket-change.ts:352` is deliberately left to propagate —
      the other honest option. Not every effect should be swallowed.
- [x] `check:build-swallowed-writes` → self-test 7 passed, 2 sites at ratchet 2. Those two wrap
      `this.db.transaction(...)`, which under the tenant proxy **is** a savepoint, and pass `tx`
      explicitly to every callee — verified safe, not debt.

## B7 — The effect set follows what changed, not which route changed it

**PARTIAL.**

- [x] `applyTicketChange` exists and owns the detail route's effect set; `check:ticket-write-module`
      gates writes through it (tickets 43, 45).
- [ ] **Rank and bulk still carry their own inline effect dispatch** via injected `effectDeps` rather
      than delegating — ticket 44 box 1, deferred because `applyTicketChange` wraps its own
      transaction. Until then, dragging a card to Done and editing the same field in the detail panel
      still produce different effect sets.

## B9 — One Build list surface

**DONE.**

- [x] `frontend/features/build/shared/build-list-surface.tsx` owns the assembly: branch order,
      `isEmpty` resolution, cursor and server pagination.
- [x] 29 consumers under `features/build/**`.
- [x] Gated: `frontend/scripts/check-build-list-surface.mjs` flags any Build page rendering `DataTable`
      alongside `usePageState`; the allowlist holds 3 documented exemptions.
- [x] The `risks-page` / `all-work-page` `isEmpty` asymmetry the review cited is gone — `risks-page.tsx`
      renders through the surface and no longer calls `usePageState` directly.
- [x] FE-125 clean: all 16 "Load more" strings in `features/build/**` are the `label` prop of
      `InfiniteScrollSentinel`, a screen-reader fallback behind an `IntersectionObserver` — not reveal buttons.
- Gate blind spot, recorded: `all-work-page.tsx` still hand-rolls the assembly and passes because it
  reaches `DataTable` through an intermediate component. The gate prints this limitation itself.

## B10 — Search reaches the read contract

**PARTIAL.**

- [x] Governance is server-side: `hooks/api/build/governance.ts:39-46` carries `search`, forwarded at
      `:76,83`; `risks-page.tsx:91` and `decisions-page.tsx:89` pass `debouncedSearch`.
- [x] **Project views search reaches the server** (commits `47482aa55`, `894e9dbbb`). `listViewsQuerySchema`
      gained a bounded, trimmed, optional `search`, kept `.strict()`; the service ANDs
      `name ILIKE 'term%'` — **trailing wildcard only, so it stays btree-usable per BE-49** — through the
      existing `escapeLike`, so a user typing `%` cannot match everything. The client-side `.filter(...)`
      is deleted and `debouncedSearch` is passed down. Keyset contract intact.
      Cost to the user, stated plainly: prefix-only matching. "Sprint Board" matches "Sprint";
      "Weekly Sprint" does not.
      Carried a bonus fix — the `views` query key took an optional cursor, making the unfiltered key the
      same *length* as a keyed one instead of a prefix of it. Same defect class as card A3. Now a true
      4-segment prefix (FE-34). 37 tests pass; `check:contract-parity` still PASS.
- [ ] Same shape, lower severity, over catalog-sized or per-project lists:
      `modules-page.tsx:71,76`, `automations-page.tsx:114-115`, `cycle-detail-page.tsx:212,223`,
      `qa/runs/run-execution-page.tsx:213,216`, `workflow-page.tsx:66-87`,
      `settings/project-settings-fields-page.tsx:33-60`, `custom-fields-settings.tsx:354-355`.
      Each needs its backing endpoint checked for a `search` param before the page is touched.

## B11 — Gates stop reporting coverage they never checked

**DONE.**

- [x] `check-transaction-callbacks.mjs` scopes its verdict to the enclosing `describe` block, not the
      whole file text — `:343-358` calls `enclosingDescribeText(text, d.charIndex)`. The fix raised the
      ratchet 2 → 8 because six doubles correctly re-classified as VOID.
- [x] `crNumber` allocation is extracted as its own module with its own tests —
      `client-portal/change-request-number-counter.ts`, plus `.spec.ts` and a `.db.spec.ts` asserting
      `pg_advisory_xact_lock` serialises concurrent allocation.
- [x] All 24 Build e2e specs now carry a success assertion — 0 of 24 lack one (ticket 60).
- [x] `check:build-authz-census` has a real ratchet against
      `docs/build-module/authorization-census-ratchet.json`, with a self-test proving it catches both
      directions. It currently exits 1 on stale REVIEWED anchors — evidence it is live, not decorative.
- [x] `assignee-filter.spec.ts` asserts `.not.toContain("EXISTS")` beside `UNION ALL`, and pins the
      executed SQL to the shared builder, so the test name no longer outruns what it proves.
- Correction to the review: **`check:build-execution-plan` does not exist** and never did — no script,
  no npm target, no git history under that name. That card's claim cannot be actioned as written.
- [x] `createChangeRequest`'s wrapper now has its own spec — `client-portal/change-requests-create.spec.ts`
      (commit `47482aa55`): access gate denies before the transaction opens, field mapping, the row
      really comes from inside the transaction, and the audit entry is written on success and not on
      denial. Its transaction double **invokes its callback**, so the assertions inside it run (BE-136).
      Deliberately in a new file: `change-requests.isolation.spec.ts` sits at the
      `check:transaction-callbacks` VOID ratchet ceiling with 13 bare doubles, and growing it would
      have pushed the gate over.

## B12 — Invariants the schema could enforce

**DONE** — all six closed; the last one was still live until 2026-09-29.

- [x] **Client-portal parent visibility — fixed 2026-09-29, commit `6b7a5adf5`.** This was the one
      finding still live. See ticket 35 for why it was reported done on 2026-09-27: the evidence was
      earned against `modules/portal/client/portal-client.service.ts`, a different registered service.
      The Build-owned `ClientPortalService` served comments and attachments from internal-only tickets
      to external portal clients on `GET /build/portal/projects/:projectId/overview`.
      `eq(tickets.clientVisible, true)` added to both joins in `getProjectOverview` **and**
      `getPortalPreview`. Two assertions failed first; a paired positive keeps the child flag honest.
      `npx jest src/modules/build/client-portal/` → 8 suites, 100 tests, pass.
- [x] Cycles: `uniq_cycles_one_active_per_project` (partial unique) and `excl_cycles_no_date_overlap`
      (`EXCLUDE USING gist`) — `migrations/1371`, journalled, proved as the application role with
      23505 and 23P01 and paired positive controls. The service translates both to a clean 409.
- [x] Soft delete: all 7 unique indexes rebuilt partial with `WHERE deleted_at IS NULL` —
      `migrations/1380`, with in-migration `ASSERT` post-checks for each.
- [x] The `fk_tickets_status` NULL hole is closed by making `tickets.project_id` NOT NULL —
      `migrations/1381`, BE-63 three-step, production survey first returned 0 project-less rows.
- [x] `okr_links` exclusive arc — `migrations/1372` adds `CHECK (num_nonnulls(ticket_id, project_id) = 1)`
      plus a partial unique on `(goal_id, project_id)`, closing link-to-nothing, link-to-both and
      unbounded duplicates.
- [x] The off-journal tables are journalled — `migrations/1393_build_qa_bug_tables.sql` (idx in
      `_journal.json`) creates both with RLS and policies; `1394` handles the `cycle_scope_events` rename.
- [x] **Hardcoded table names in `sql` templates now have a gate** (commit `47482aa55`).
      `check:build-sql-table-literals` extracts every `build.*` / `build_events.*` literal appearing
      inside a `sql` template and asserts each names a real Drizzle table.
      Result: **624 files scanned, 40 literals, 0 unknown** — so the review's "all correct today" holds,
      and drift is no longer silent. The self-test plants a bad table name and proves the gate catches
      it (10/10), because a gate with no self-test reports zero vacuously.
      The review's "62" appears to have counted `build.table(...)` schema-builder calls, not
      sql-template literals; the real figure is 40.
      Gate states its own blind spots: names built by concatenation, literals outside `sql` templates,
      and migration files.

## X1 — `check:type-assertions` is red

**DONE.** Not a review card; surfaced while verifying B5/A4 and it was blocking a clean gate run.

Correction worth recording: both CLAUDE.md files call this a hard zero for `as X`. Reading the script,
hard zero applies only to `as any` / `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck`. Plain `as X`
and non-null `!` are a per-file, zero-growth ceiling.

`node scripts/check-type-assertions.mjs` → exit 1, three failures:

**Closed 2026-09-29, commit `e751c2123`.** `node scripts/check-type-assertions.mjs` → **exit 0**.

- [x] Eleven assertions **narrowed, not ledgered**, so the claim is true rather than excused:
      `page-grants-sheet.tsx` (`ACCESS_OPTIONS.find` runtime narrow), `portals-gallery.tsx` (explicit
      annotation replacing `{} as Record<>`), `use-board-saved-views.ts` (parameter widened to
      `{ target: { value: string } }`, which removed the cast at its call site too), and seven
      `jest.requireMock() as {}` in `product-scope-pages.test-harness.tsx`.
- [x] Two genuinely unavoidable assertions ledgered **with their reason**: the e2e API oracle (an
      external seam) and one `initialPageParam` in `hooks/api/build/advanced.ts`. The second wants an
      explicit generic on `useInfiniteQuery`; left rather than reached across file ownership.
- [x] 28 stale ceiling entries pruned via `--update-ledger`, which can only lower.
- [x] `CEILING_FLOOR_TOTAL` 458 → 423 — the ratchet moving in its **tightening** direction, documented
      in the file's existing convention. No gate logic was changed; the diff is the constant and a comment.
- [x] Final: 423 plain assertions (413 `as X` + 10 non-null) in 248 files, and **0** of
      `as any` / `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck`. `pnpm type-check` exit 0.

---

## What no one has measured

Carried forward from both reports, still true on 2026-09-29:

- **No query plan.** Every connection string in these repos points at production, so no `EXPLAIN` was
  run. Every index and performance claim above is reasoned from column lists and predicate shape.
- **No browser.** The capture stack is gone; browser-class acceptance boxes stay unchecked on purpose
  (`BROWSER-VERIFICATION-EXCLUSIONS.md`).
- **CI is dead** — GitHub Actions billing lapsed, so a red workflow is not evidence of a defect and a
  green one is not evidence of health. Every gate result above was run locally and is quoted with its
  command.
