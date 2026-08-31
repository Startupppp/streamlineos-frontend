# ADR-0003 — `accounting.journal.posted` is not emitted; no consumer is required

**Date:** 2026-08-31  
**Status:** DECIDED  
**Lane:** L38

---

## Context

The lane task required deciding whether `accounting.journal.posted` needs a consumer in the outbox system. The task notes it appears only as a fixture string in a spec file. This ADR records the verified current state and the decision.

## Investigation

### Gate output — `check:outbox-consumers` (run 2026-08-31)

```
Scanned 4972 TypeScript files
Emitted event types  (21): billing.revenue-event, build.release.published,
  build.ticket.status_changed, build.sprint.completed, chat.message.fanout,
  deal.closed, sign.envelope.completed, expense.export.requested,
  accounting.bill.approved, accounting.bill.paid,
  accounting.invoice.reminder.due, finance.report.export.requested,
  gdpr.export.requested, hr.helpdesk.ticket_created,
  hr.helpdesk.ticket_assigned, hr.helpdesk.ticket_status_changed,
  inventory.stock.low, kb.content.index,
  integration.connection.disconnected, support.ticket.resolved,
  survey.response.submitted
Consumed event types (23): deal.closed, billing.revenue-event, …
OK — every emitted outbox event type has a registered consumer
```

`accounting.journal.posted` is **not present** in the emitted list.

### Grep proof

```
grep -r "accounting.journal.posted" src/ --include="*.ts"
(no output — zero matches)
```

The task description stated it appears in `cross-cell-events.spec.ts`; the current source does not contain it there or anywhere else. It may have existed in an earlier draft and was removed before this audit.

### How payroll actually posts to accounting

The posting path is a **direct synchronous service call**, not an outbox event:

```
PayrollPostingService.postFinalized / postPaid
  → FinancePostingService.postJournal(u, {
        sourceType: "PAYROLL_RUN",
        sourceId: String(runId),
        sourceEvent: "finalized" | "paid",
        …
    })
  → db.transaction (idempotency check on (orgId, sourceType, sourceId, sourceEvent))
  → journalEntries INSERT (or returns existing on replay)
```

No event is written to the outbox; no relay or consumer is involved.

## Decision

**`accounting.journal.posted` is not emitted anywhere in the codebase. No consumer is required.**

If a future integration needs to react to a posted journal (e.g., notify an ERP), it must:
1. Add an `OutboxWriter.emit(tx, "accounting.journal.posted", payload)` call inside `FinancePostingService.postJournal` immediately after the INSERT.
2. Add a consumer class with `readonly eventType = "accounting.journal.posted"` and register it with the event registry.
3. Re-run `check:outbox-consumers` to verify the gate passes.

Doing step 1 without step 2 will cause `check:outbox-consumers` to fail CI.

## Open gaps found (not fixed — L38 has spec-only ownership)

| Gap | File:line | Description |
|---|---|---|
| Atomicity | `src/modules/payroll/payout/locking.service.ts:83` | `postFinalized` is called INSIDE the payroll run lock transaction, but `FinancePostingService.postJournal` opens its own top-level transaction. If the lock transaction fails after the journal commits, a journal entry exists for a run that is not LOCKED. The idempotency key prevents duplicate entries on retry, but the dangling entry for an unlocked run is not cleaned up. Fix: move `postFinalized` to `registerAfterCommit`. |
| Silent failure | `src/modules/payroll/payroll-posting.service.ts:77-89` | `postPaid` wraps `postJournal` in a bare `try/catch` that logs and discards the error. A `42501` (no tenant GUC) or a network failure silently drops the paid journal entry with no DLQ record. Fix: use the outbox for this side effect so the relay retries it. |

## Verification commands run

```
node src/scripts/check-outbox-consumers.mjs  → exit 0
node src/scripts/check-idempotent-commands.mjs → exit 0
node src/scripts/check-mock-surface.mjs → exit 0
node ./node_modules/jest/bin/jest.js src/modules/payroll/__tests__/payroll-accounting-seam.spec.ts --maxWorkers=2
  → 10 passed
```
