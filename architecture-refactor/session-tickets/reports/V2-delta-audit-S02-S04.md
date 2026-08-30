# V2 Delta Audit — S02 (HRMS) and S04 (Build/PM & Workflows)

Audit date: 2026-08-30. Read-only; no edits made to source.

---

## S02 Checked Items

### S02-[x]-1 — Split cohesive HR files over the hard limit

**Claim:** `hiring.ts` (976) split into four files; `hr-calendar-source.ts` (589→479) + extracted `hr-calendar-sub-sources.ts` (122).

**Verification:**

Hiring split — `db/schema/hr/` via glob:
- `hiring-core.ts` — 140 lines ✓
- `hiring-candidates.ts` — 226 lines (ticket said 227; off by one, acceptable)
- `hiring-interviews.ts` — 249 lines (ticket said 242; minor drift)
- `hiring-pipeline.ts` — 377 lines ✓
- `hiring.ts` is gone ✓

Calendar split — `modules/hr/` (not schema folder):
- `hr-calendar-source.ts` — 473 lines (ticket said 479; minor drift)
- `hr-calendar-sub-sources.ts` — 122 lines ✓

Note: `hr-ai.service.ts` (812 lines) is correctly marked OUT-OF-OWNERSHIP in the ticket; that stays open under S07.

**Verdict: VERIFIED DONE.**

---

### S02-[x]-2 — Cross-tenant WFH index and torn payroll run

**Claim:** WFH index has `orgId` leading. Torn payroll run verified by S03 invariant spec.

**Verification:**

`backend/src/db/schema/hr/attendance.ts:85`:
```
uniqueIndex("uniq_wfh_requests_org_user_date").on(table.orgId, table.userId, table.date)
```
`orgId` leads the composite index. ✓

Torn payroll run: ticket delegates to S03 item 3.2; out of scope for this lane.

**Verdict: VERIFIED DONE.**

---

## S04 Checked Items

### S04-[x]-1 — Guard audit: 0 permissioned handlers without @UseGuards(JwtAuthGuard, PermissionGuard)

**Claim:** 0 violations. Every Build controller carries class-level `@UseGuards`. Both `WorkflowsController` (line 34) and `AutomationController` (line 12) confirmed.

**Verification:**

`grep -rL "UseGuards(JwtAuthGuard, PermissionGuard)" backend/src/modules/build/ --include="*.controller.ts"` — empty output (0 violations) ✓

`grep -rL "UseGuards(JwtAuthGuard, PermissionGuard)" backend/src/modules/workflows/ --include="*.controller.ts"` — returns only `workflows-cron.controller.ts`, which is `@Public()` + `assertCronSecret(authorization)` — not a permissioned handler, no violation.

`backend/src/modules/workflows/workflows.controller.ts:44`: `@UseGuards(JwtAuthGuard, PermissionGuard)` ✓ (ticket said line 34; line 44 in current source — minor drift)

`backend/src/modules/automation/automation.controller.ts:16`: `@UseGuards(JwtAuthGuard, PermissionGuard)` ✓ (ticket said line 12; line 16 in current source — minor drift)

**Verdict: VERIFIED DONE.**

---

### S04-[x]-2 — Unknown workflow routes fail closed; universal-route-matrix test confirmed

**Claim:** Fail-closed allowlist (S09 "Already done"); 57-row `universal-route-matrix` test confirmed.

**Verification:**

Test file exists: `frontend/lib/rbac/route-access/__tests__/universal-route-matrix.test.ts` (158 lines) ✓

MATRIX array has **50 rows** (ticket claimed 57 — count is off). The test at line 76 asserts `MATRIX.length > 40`, which passes at 50.

S09 ticket explicitly lists this as already done: "A 57-row `universal-route-matrix` test exists alongside `no-legacy-role-gates`, `route-access-keys`, `route-access-coverage` and `page-level-gates`. 32/32 pass."

The count mismatch (50 vs 57) is an inaccuracy in the prior report; the test and the fail-closed behaviour are real.

**Verdict: VERIFIED DONE.** (Row count was overstated by 7 in the ticket; test and mechanism are real.)

---

### S04-[x]-3 — `projects-tickets-read.service.ts` split

**Claim:** Extracted `projects-tickets-detail.service.ts` (164 lines); read service now 429 lines.

**Verification:**

`wc -l`:
- `backend/src/modules/build/core/projects-tickets-read.service.ts` — **429 lines** ✓
- `backend/src/modules/build/core/projects-tickets-detail.service.ts` — **164 lines** ✓

**Verdict: VERIFIED DONE.**

---

## S02 Open Items — Premise and Status

### §1 — Table inventory and freeze

**Status: GENUINELY OPEN.**

No classification document found for the 170+ HR tables. The freeze rule (no new `hr_*` table) is a CLAUDE.md constraint, but the INVENTORY classification ("active · compatibility-held · superseded · removable") has not been produced. The scan-failure warnings in sub-items 1.1–1.2 are still valid guard rails. Work is an analysis + documentation task of significant size (~170 tables across 64 schema files).

---

### §2 — Projections (privacy headline)

**Status: GENUINELY OPEN (partially addressed).**

Grep for bare `user: true` / `creator: true` / `approver: true` in `with:` clauses across all S02 module trees — zero hits. Explicit column projections (`columns: { id: true, name: true }`) are used consistently in the lifecycle and performance services found.

However, sub-item 2.3 ("Add tests that assert the exact returned key set") is not verifiable by grep and no key-set assertion tests were found in a targeted search. This sub-item remains open regardless of projection quality — the test gate is what proves no silent widening.

**Work remaining:** Write key-set assertion tests for sensitive HR responses (payroll, banking, tax, identity documents, performance). Medium size — one test per sensitive endpoint class.

---

### §3 — Bounded lists and search

**Status: GENUINELY OPEN.**

Only 8 uses of `buildCursorPage` / `decodeCursor` across all HR module services. The code has 95+ `findMany` calls in service files. Most HR lists use offset pagination; the cursor/filter/sort contract has not been broadly applied.

Sub-item 3.2 (leading-wildcard search → SECURITY DEFINER or FTS) is a separate track. The `app.search_ticket_ids` DEFINER shape (migrations 0424/0425) is the canonical model, but adoption across HR search endpoints is unknown.

**Work remaining:** Large. Requires auditing ~30–40 list endpoints and migrating growing ones to cursor pagination.

---

### §4-1,2 — Scope correctness (list/detail reads and optional subject filter)

**Status: GENUINELY OPEN.**

DataScope correctness requires per-endpoint verification that cannot be confirmed by static grep alone. The specific concern (§4-2: an optional `userId` filter that widens `own`/`team` scope via a no-op `manage` gate) requires tracing each optional filter through its permission check.

**Work remaining:** Large. Requires auditing every HR endpoint that accepts an optional `userId` or `personId` filter.

---

### §4-3 — Ghost key `hr:employees:export`

**Status: ALREADY DONE.**

`hr:employees:export` does not appear in either the backend permission catalog (`backend/src/modules/rbac/permissions/`) or the frontend union (`frontend/lib/rbac/permissions/`). The key appears only in `src/scripts/check-permission-keys.mjs` as a historical example of a ghost key. No ghost exists. Memory confirms: "HR permission catalog findings.md — ghost key ✅ FIXED 2026-08-30."

The ticket task was "Confirm against the current catalog; if the key is missing, report it to S01." The ghost has been removed; no report to S01 is needed.

---

### §5 — Keys and structure (serial risk register)

**Status: GENUINELY OPEN.**

The ticket note reads: "L22 produced a repo-wide serial risk register covering 588 int4 columns; HR-specific KEEP/MIGRATE decisions not individually recorded." The per-table decisions (KEEP with reasoning, or MIGRATE) are still absent. No decision record found for HR tables.

**Work remaining:** Medium. Classify each HR serial table against the target-scale lifetime and cross-cell requirement. Most will be KEEP (bounded catalogs); document those decisions explicitly.

---

### §6 — Tenant isolation coverage

**Status: GENUINELY OPEN.**

Covering ~151 services across `hr/**`, `directory/**`, `careers/**`, `offer-fulfillment/**` and `e-sign/**` with cross-tenant DENY + same-tenant CONTROL cases is a large test-writing effort. No estimate available without a service inventory.

**Work remaining:** Very large (151 services).

---

### §7-1 — Split oversized frontend files

**Status: ALREADY DONE.**

Both files are now under the 500-line hard limit:
- `frontend/features/hr/performance/reviews-tab.tsx` — **361 lines** (was 511)
- `frontend/features/hr/leaves/components/leaves-wfh-content.tsx` — **393 lines** (was 503)

---

### §7-2 — Sensitive hook gating

**Status: GENUINELY OPEN.**

Verifying that every sensitive HR hook gates internally on its exact backend permission key requires per-hook inspection. Self-service hooks are deliberately ungated. No automated gate exists (unlike `check:query-scope` which covers query scope only, not permission keys). This is a medium-sized audit task.

---

### §7-3 — Loading / refresh / error / denied / empty states

**Status: GENUINELY OPEN.**

Not systematically verifiable by static analysis. Each HR frontend page must be inspected. No evidence of completion found.

---

## S04 Open Items — Premise and Status

### §2-1 — automations.ts: no useCan gates

**Status: ALREADY DONE.**

`frontend/hooks/api/automations.ts` (231 lines) — all 7 hooks gated:
- `useAutomations`: `const canView = useCan("settings:automations:view")`, `enabled: canView` (line 148)
- `useAutomationRuns`: same key, `enabled: canView && ...` (line 157)
- `useCreateAutomation`, `useUpdateAutomation`, `useToggleAutomation`, `useDeleteAutomation`, `useTestAutomation`: all use `const canManage = useCan("settings:automations:manage")` + `assertPermission(canManage)` in `mutationFn`

Both keys (`settings:automations:view`, `settings:automations:manage`) exist in `backend/src/modules/rbac/permissions/shared.ts:219,225` and `frontend/lib/rbac/permissions/permission-key-foundation.ts:107` / `shared.ts:179`.

---

### §2-2 — build/workflow.ts: 4 mutations with no gate

**Status: ALREADY DONE.**

`frontend/hooks/api/build/workflow.ts` — all 4 mutations gated:
- `useCreateTransition`: `const canManage = useCan("build:workflow:manage")`, `assertPermission(canManage)` (line 39)
- `useUpdateTransition`: same (line 54)
- `useDeleteTransition`: same (line 72)
- `useUpdateStatusWip`: same (line 87)

Query hook `useWorkflowTransitions`: `enabled: canView && !!projectId` where `canView = useCan("build:workflow:view")`.

Both keys exist in `backend/src/modules/rbac/permissions/build.ts:328,334` and `frontend/lib/rbac/permissions/permission-key-business.ts:134`.

---

### §2-3 — Remove caller-provided authorization booleans

**Status: ALREADY DONE.**

Both `automations.ts` and `build/workflow.ts` resolve permissions internally via `useCan`. No caller-provided authorization boolean parameters exist in either file.

---

### §3 — Bounded, indexed boards and lists

**Status: GENUINELY OPEN.**

The Build boards require per-endpoint verification of cursor vs offset pagination. The ticket notes a prior pass concluded "board already uses cursor; other lists are offset with cap 100 — acceptable" but asserts this is not the PRD contract. Re-examination and per-list KEEP/MIGRATE decisions are required.

**Work remaining:** Medium–large. Need to enumerate every Build and Workflow list endpoint, measure growth characteristics, and migrate growing ones to cursor pagination.

---

### §4 — Query cost (measure, do not guess)

**Status: GENUINELY OPEN.**

`pnpm db:check-build-reads` currently needs seed data (`SEED_ORG_ID` has no build tickets). The gate is vacuous without seed data. Measurement as `streamline_app` with the tenant GUC is not yet done.

**Work remaining:** Large. Requires seeding production-shaped data (`pnpm seed:build-load`), capturing baselines, and tuning/validating each query.

---

### §5-a — `goals.service.ts` (618)

**Status: GENUINELY OPEN.** File is 618 lines; split is blocked by cross-module consumers (`hr/performance`). Correctly classified OUT-OF-OWNERSHIP; report remains needed.

---

### §5-b — `build-entity.adapter.ts` (598)

**Status: GENUINELY OPEN.** File is 598 lines at `backend/src/modules/build/entity/build-entity.adapter.ts`; split blocked by `entity-reference` consumer. OUT-OF-OWNERSHIP report still needed.

---

### §5-c — `tasks.service.ts` (547)

**Status: GENUINELY OPEN.** File is 547 lines; split blocked by `surveys` consumer. OUT-OF-OWNERSHIP report still needed.

---

### §5-d — `automation-meta.ts` (693)

**Status: ALREADY DONE (with a new violation introduced).**

`frontend/components/automations/automation-meta.ts` is now **87 lines** (was 693). The content was extracted into:
- `automation-trigger-data.ts` — **605 lines** — ABOVE the 500-line hard limit. This is a new violation introduced by the split. The work is not fully complete: `automation-trigger-data.ts` needs further decomposition.

---

### §5-e — `workflows/page.tsx` (543)

**Status: GENUINELY OPEN.** File is 543 lines; this is the S09 item explicitly called out in the ticket. OUT-OF-OWNERSHIP from S04's perspective; report to S09.

---

### §6 — Tenant safety and invalidation

**Status: GENUINELY OPEN.**

Cross-tenant `org_id` enforcement, transactional bulk writes, mutation invalidation coverage and historical identity preservation all require per-endpoint verification. Not systematically checkable by static grep.

**Work remaining:** Large.

---

### §7 — Workflow specifics

**Status: GENUINELY OPEN.**

Mapping all workflow routes to exact backend permissions (not a single broad module key), splitting builder modules by domain, and proving the five isolation scenarios (module disabled, permission denied, DataScope, cross-tenant, secret redaction) all require active work. The existing e2e spec (56 tests) and gate test (52 tests) are larger than the ticket claimed (22 and 13), indicating growth, but coverage of the five scenarios must be verified by reading the spec.

**Work remaining:** Large — depends on how much the existing 56-test e2e spec already covers.

---

### §8 — Tenant isolation coverage (~60 services)

**Status: GENUINELY OPEN.**

No cross-tenant DENY + same-tenant CONTROL test coverage verified for `build/**`, `issues/**`, `tasks/**`, `goals/**`, `reports/**`, `workflows/**`, `automation/**`, `autonomy/**`. Large test-writing effort.

---

### §9 — Outbox orphan events

**Status: ALREADY DONE (for S04's scope).**

`pnpm check:outbox-consumers` output (run 2026-08-30):

Emitted from S04 trees that are now consumed:
- `build.release.published` ✓
- `build.ticket.status_changed` ✓
- `build.sprint.completed` ✓

4 orphans remain, ALL from the `inventory` module (not S04's ownership):
- `inventory.purchase_order.received` — `grn.service.ts`
- `inventory.sales_order.fulfilled` — `so-fulfillment.service.ts`
- `inventory.shipment.dispatched` — `shipments.service.ts`
- `inventory.stock.adjusted` — `inv-stock-adjustments.service.ts`

No S04 orphans remain. The original "22 orphan event types" reported in the ticket have been reduced to 4, none from S04's ownership.

---

## Summary Counts

| Verdict | S02 | S04 | Total |
|---|---|---|---|
| VERIFIED DONE (checked items) | 2 | 3 | 5 |
| ALREADY DONE (open items, free ticks) | 3 | 5 | 8 |
| GENUINELY OPEN | 7 | 8 | 15 |
| PREMISE FALSE | 0 | 0 | 0 |
| NEW FINDING (not an open item) | 0 | 1 | 1 |

New finding: `automation-trigger-data.ts` at 605 lines is a new 500-line violation introduced by the §5-d split — not previously tracked.

---

## ALREADY DONE Items (free ticks — exact item text for line-matching)

### S02

1. `- [ ] Known catalog defect to verify: a ghost key \`hr:employees:export\` was reported to break CSV export for non-owners. Confirm against the current catalog; if the key is missing, report it to S01 (catalogs are theirs).`
   — Key absent from both catalogs; no ghost exists; verified FIXED.

2. `- [ ] Split \`features/hr/performance/reviews-tab.tsx\` (511) and \`features/hr/leaves/components/leaves-wfh-content.tsx\` (503).`
   — `reviews-tab.tsx` is 361 lines; `leaves-wfh-content.tsx` is 393 lines; both under the 500-line limit.

### S04

3. `- [ ] \`frontend/hooks/api/automations.ts\` has **no \`useCan\` gates on any hook**. Gate each one internally with its exact key (likely \`settings:automations:view\` / \`:manage\` — verify both catalogs before using; if a key is missing, report it to S01, do not add it).`
   — All 7 hooks gated; keys exist in both catalogs.

4. `- [ ] \`frontend/hooks/api/build/workflow.ts\` has **4 mutations with no gate**. Gate them (likely \`build:workflow:manage\` — verify verbatim in both catalogs first).`
   — All 4 mutations gated; key `build:workflow:manage` exists in both catalogs.

5. `- [ ] Remove caller-provided authorization booleans wherever the hook can resolve the permission itself.`
   — No caller-provided booleans in either file; both resolve internally.

6. `- [ ] \`frontend/components/automations/automation-meta.ts\` (693) and \`frontend/app/(authenticated)/workflows/page.tsx\` (543 — report to S09)`
   — `automation-meta.ts` is now 87 lines (split done). Note: `automation-trigger-data.ts` (605 lines) is a new violation requiring follow-up. The `workflows/page.tsx` portion stays open under S09.

7. `- [ ] \`pnpm check:outbox-consumers\` reports **22 orphan event types repo-wide**. Close the ones emitted from your trees: register an idempotent consumer, or remove the emission with zero-consumer proof.`
   — All Build/Workflow events consumed; 4 orphans remain but all are in `inventory` module, outside S04 scope.

> Note: Item 6 above is a partial free tick only — the `automation-meta.ts` split part is done, but `automation-trigger-data.ts` at 605 lines is a new violation that blocks full completion of the §5 decomposition sub-item. Tick the `automation-meta.ts` part; add a note about `automation-trigger-data.ts`.
