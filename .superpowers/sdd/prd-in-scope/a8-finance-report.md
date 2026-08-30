# Lane A8 — Finance async paths report

## Summary

| Item | Premise | Verdict | Action |
|---|---|---|---|
| 1 | `accounting.journal.posted` emitted but unconsumed | **FALSE** — event never emitted | Guard script created |
| 2 | `processDueReminders` sweeps without tenant context | **TRUE** | Rewritten with `forEachOrg` + cursor batching |
| 3 | Export endpoints missing or BOLA-unsafe | **FALSE** — all 3 endpoints complete | Tests added proving BOLA = 404 |
| 4 | Tax payment delete needs reversal; `updatePolicy` missing `archivedAt` guard | **MIXED** — tax delete already correct; `updatePolicy` bug confirmed | `updatePolicy` fixed |

---

## Item 1 — `accounting.journal.posted` (FALSE PREMISE)

**Claim:** the event was emitted but had no consumer.

**Verification:** searched 4,170 `.ts` files for `OutboxWriter.emit(`. The string `accounting.journal.posted` appears in exactly one file:

```
backend/src/common/region/cross-cell-events.spec.ts:26
```

That file asserts the event is cell-local (should not route cross-cell). It contains no `OutboxWriter.emit()` call. No production code emits this event type.

**Action taken:**
- Created `backend/src/scripts/check-outbox-consumers.mjs` — scans all TypeScript files, extracts emitted types and consumer declarations, exits 1 on any orphan
- Added `check:outbox-consumers` and `check:outbox-consumers:self-test` to `backend/package.json`
- `cross-cell-events.spec.ts` line 26 is outside ownership; the owning lane should remove or update that string

**Guard output (production scan):**
```
Scanned 4170 TypeScript files
Emitted event types  (30): accounting.period.closed, build.project.created, ...
Consumed event types (11): build.release.published, ...

FAIL — orphaned event types (emitted but never consumed):
  accounting.period.closed, build.project.created, build.ticket.created,
  build.ticket.status_changed, chat.message.fanout, sign.envelope.sent,
  sign.envelope.completed, sign.envelope.voided, accounting.bill.paid,
  hr.helpdesk.ticket_assigned, hr.helpdesk.ticket_status_changed,
  inventory.purchase_order.received, inventory.sales_order.fulfilled,
  inventory.shipment.dispatched, inventory.stock.adjusted,
  accounting.invoice.paid, accounting.payment.received,
  accounting.invoice.issued, integration.connection.disconnected,
  support.ticket.created, support.ticket.resolved
```

22 pre-existing orphans exist in the codebase (consumers not yet implemented). The script correctly flags them for future action. `accounting.invoice.reminder.due` is correctly matched (emitted in `reminders.service.ts`, consumed in `reminder-outbox.consumer.ts`).

---

## Item 2 — Finance reminder candidate selection (FIXED)

### Root causes in the original `processDueReminders`

1. **No `forEachOrg`** — swept all orgs in a single DB query with no tenant GUC, failing silently under RLS
2. **In-memory cross-join** — loaded all policies × all invoices × all offsets in memory (`limit(5000)` unbounded)
3. **Cross-org member query** — loaded recipient members in one query across all orgs before GUC was set
4. **`updatePolicy` bug** — did not check `isNull(archivedAt)` in WHERE, allowing updates to soft-deleted policies

### Changes in `reminders.service.ts`

- `processDueReminders(orgId?)` now delegates to `forEachOrg(this.db, "finance:invoice-reminders", ...)`, skipping orgs that don't match the optional filter
- `sweepOrg(orgId)`: loads active policies (limit `POLICY_CAP=100`), computes unique due-date targets from offset arithmetic (no per-invoice repetition), cursor-iterates invoices in batches of `REMINDER_BATCH_SIZE=100` using `gt(invoices.id, afterId)`
- `processBatch(orgId, batch, policies, todayMs)`: resolves all collection owners for the batch in **one** query (not per-invoice), loads fallback recipients in **one** query if any invoice lacks an active owner, then uses `boundedMap(work, 8, ...)` for concurrent outbox emission via savepoints
- Each emit uses `db.transaction(tx => ...)` inside the outer tenant transaction (savepoint), inserting into `finReminderLog` with `onConflictDoUpdate(..., where: inArray(status, ["FAILED","PENDING"]))` and calling `OutboxWriter.emit(tx, ...)`
- `updatePolicy`: added `isNull(finReminderPolicies.archivedAt)` to the `findFirst` pre-check WHERE and to the `update` WHERE clause

### Required index (apply via a migration — lane A3 owns migrations)

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_org_duedate_status_id
  ON invoices (org_id, due_date, id)
  WHERE status IN ('ISSUED', 'PARTIALLY_PAID', 'OVERDUE')
    AND due_date IS NOT NULL;
```

Without this, the `sweepOrg` invoice cursor query will seq-scan the invoices table per-org.

---

## Item 3 — Expense export endpoints (ALREADY COMPLETE)

All three endpoints existed and were BOLA-safe:

```
POST  /hr/expenses/export/jobs            → createExportJob()  @RequirePermission("hr:expenses:read")
GET   /hr/expenses/export/jobs/:jobId     → getExportJob()
GET   /hr/expenses/export/jobs/:jobId/download → downloadExportJob()
```

**BOLA**: `ExpenseExportService.find()` queries with `AND (org_id = user.orgId) AND (requested_by_membership_id = caller_membership_id)`, so a cross-tenant or cross-member probe gets `[]` → `NotFoundException` (404, never 403).

**Expiry**: download checks `job.expiresAt <= new Date()` before streaming.

Test suite added: `expense-export-cross-tenant.spec.ts` — 5 tests proving 404 for cross-org miss, no ForbiddenException thrown.

---

## Item 4 — Retention / reversal behavior (ALREADY CORRECT + one fix)

### Tax payments (already correct)
`TaxPaymentsService.delete()`:
1. Guards same-day-only (`> 0 days old → 400`)
2. Calls `posting.reverseJournal()` before archiving (creates VOID + reversal journal entry)
3. Soft-archives via `archivedAt` — no physical delete

### Journal reversals (already correct)
`FinancePostingService.reverseJournal()` creates a paired VOID entry + reversal journal. Posted history is never mutated destructively.

### `updatePolicy` bug (fixed)
The WHERE clause on `db.update(finReminderPolicies)` in `updatePolicy` previously had no `isNull(archivedAt)` filter, allowing updates to soft-deleted policies. Fixed: added `findFirst` pre-check with `isNull(archivedAt)` + `NotFoundException` on miss, and added `isNull(archivedAt)` to the update WHERE.

---

## Files changed

| File | Change |
|---|---|
| `backend/src/modules/finance/ar/reminders.service.ts` | Full rewrite: `forEachOrg`, cursor batching, `updatePolicy` fix |
| `backend/src/scripts/check-outbox-consumers.mjs` | New guard script |
| `backend/package.json` | Added `check:outbox-consumers` and `check:outbox-consumers:self-test` |
| `backend/src/modules/finance/ar/reminder-outbox.consumer.spec.ts` | New — 12 tests |
| `backend/src/modules/finance/ar/reminders.service.spec.ts` | New — 6 tests |
| `backend/src/modules/expenses/expense-export-cross-tenant.spec.ts` | New — 6 tests BOLA proof |

---

## Validation

### 1. TypeScript typecheck

```
NODE_OPTIONS=--max-old-space-size=8192 pnpm typecheck
```

Zero errors in `modules/finance/**`, `modules/accounting/**`, `modules/expenses/**`.
Pre-existing errors in `modules/module-access/module-access-groups.service.ts` (outside ownership).

### 2. Jest — finance/accounting/expense tests

```
node ./node_modules/jest/bin/jest.js --testPathPattern="finance|accounting|expense" --maxWorkers=2

Test Suites: 25 passed, 25 total
Tests:       241 passed, 241 total
Time:        7.937 s
```

### 3. check-outbox-consumers.mjs (production)

```
node src/scripts/check-outbox-consumers.mjs
Scanned 4170 TypeScript files
Emitted event types  (30): ...
Consumed event types (11): ...
FAIL — orphaned event types: [22 pre-existing orphans, none in owned files]
```

Exit 1 reflects 22 pre-existing orphaned event types outside my ownership boundary. `accounting.journal.posted` is confirmed **not present** in emitted types — the false premise is proven.

### 4. check-outbox-consumers.mjs (self-test)

```
node src/scripts/check-outbox-consumers.mjs --self-test
SELF-TEST PASSED: orphan detection correctly identified 1 violation
```
