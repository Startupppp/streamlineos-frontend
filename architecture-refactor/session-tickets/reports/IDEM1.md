# IDEM1 — Write-Path Reliability Audit

## Scope

Audit of idempotency, transactionality and retry safety across the backend write paths, triggered by the reliability rule "Idempotent + transactional writes so retries are safe."

## Gate Results

| Gate | Exit |
|------|------|
| `pnpm check:outbox-consumers` | 0 — 18 emitted event types, all consumed |
| `pnpm check:idempotent-commands` | 0 — 9 handlers in scope, all fenced or named-exception |

## Findings and Fixes

### FINDING 1 — FX gain/loss posts fired `void` (CRITICAL, FIXED)

**Files:** `src/modules/accounting/core/accounting-payables.service.ts:346` and `src/modules/invoices/invoices-payment.service.ts:155`

**Failure mode:** `void this.postApFxGainLoss(...)` and `void this.postArFxGainLoss(...)` were called after the inner payment `db.transaction()` returned. The async functions continued executing with no awaiter. Any failure (rate resolver timeout, journal insert conflict, RLS 42501) was silently swallowed via an inner `.catch()` that was also not awaited. This is the documented P0 pattern from CLAUDE.md §4: "A `void something(...)` after the handler returns runs on a COMMITTED transaction with no tenant GUC, dies 42501, and is SWALLOWED."

The inner `postRealizedGainLoss` call inside each method was additionally not awaited (used `.catch()` handler instead of `await`), adding a second layer of fire-and-forget.

**Fix:**
- `accounting-payables.service.ts:346`: `void` → `await`
- `accounting-payables.service.ts:391-403`: `this.fx.postRealizedGainLoss(...).catch(...)` → `await this.fx.postRealizedGainLoss(...)`
- `invoices-payment.service.ts:155`: `void` → `await`
- `invoices-payment.service.ts:217-229`: `this.fx.postRealizedGainLoss(...).catch(...)` → `await this.fx.postRealizedGainLoss(...)`

Both private methods already have a try-catch that logs a warning when the exchange rate is unavailable, so `await` does not change the user-visible error path — it only ensures failures are observed.

**Idempotency:** `FinancePostingService.postJournal` checks for an existing entry by `(sourceType, sourceId, sourceEvent)` before inserting. A retry calling `postRealizedGainLoss` twice returns `replayed: true` on the second call without inserting. Proven by test.

**Comparison:** `payment-run-executor.service.ts:254` already used `await this.fx.postRealizedGainLoss(...)` correctly; this fix brings the two other call sites into line.

### FINDING 2 — Non-atomic ticket number in lead conversion (HIGH, FIXED)

**File:** `src/modules/leads/lead-conversion.service.ts:298-308` (inside `dispatchConversionSideEffects`)

**Failure mode:** The onboarding ticket created on lead conversion used a read-then-write counter:
```typescript
const ticketCountResult = await this.db.select({ count: count() }).from(tickets)...
const nextTicketNumber = (ticketCountResult[0]?.count ?? 0) + 1;
await this.db.insert(tickets).values({ ticketNumber: nextTicketNumber, ... });
```

Two concurrent conversions would race to read the same count and attempt to insert the same `ticketNumber`, hitting the `uniq_tickets_project_number` unique index with a 23505 error — swallowed by the outer try-catch. Additionally, with `void this.dispatchConversionSideEffects(...)`, a client retry (e.g. after a timeout) would create a second ticket for the same conversion.

**Fix:**
- Added an idempotency guard: `db.query.tickets.findFirst({ where: eq(tickets.title, ...) })` — if the onboarding ticket already exists, skip creation.
- Wrapped ticket creation in `db.transaction()` using `allocateTicketNumbers(tx, orgId, projectId)` (the canonical atomic counter using `ON CONFLICT DO UPDATE SET next_ticket_number = ... + 1` on `build.project_ticket_counters`).

**Test:** `lead-conversion-ticket-idempotency.spec.ts` — three scenarios: (1) first call creates the ticket, (2) second call with existing ticket skips creation (`db.transaction` never called), (3) two-call sequence with state rollover uses `db.transaction` exactly once.

## Tests Written

**`src/modules/accounting/posting/fx-posting-idempotency.spec.ts`** — 3 tests:
1. `FxService` skips `postJournal` when the diff is zero (idempotency by early-return).
2. `FxService` passes identical `(sourceType, sourceId, sourceEvent)` key on both calls — `postJournal` idempotency is structurally guaranteed.
3. `FinancePostingService.postJournal` returns `replayed: true` on the second call for the same source — `db.transaction` mock invokes its callback; `insert` is called once (first call) and not on second.

**`src/modules/leads/lead-conversion-ticket-idempotency.spec.ts`** — 3 tests:
1. First call creates ticket inside a transaction with atomic `allocateTicketNumbers`.
2. Second call with existing ticket: `db.transaction` is never called.
3. Two-call sequence with state rollover: `db.transaction` called exactly once.

All tests used `resetAllMocks` (not `clearAllMocks`) and all `db.transaction` mocks invoke their callback.

## Test Count

New tests: 6 (2 spec files)  
Existing tests impacted (run and verified): 13 pass across `accounting-payables-tenant-isolation`, `invoices-payment-tenant-isolation`, `lead-conversion-tenant-isolation`, `lead-conversion-ticket-idempotency`.

## Remaining Observations (no fix, report only)

**`void this.dispatchConversionSideEffects(...)` (lead-conversion.service.ts:57):** The ticket creation is now idempotent, but `dispatchConversionSideEffects` is still `void` — notification dispatch on retry would fire again. This is acceptable: `NotificationDispatchService.emit` is deduplicated at the consumer; the comment in the code documents the deliberate choice.

**`hr/time/overtime.service.ts:75` — `void this.startOvertimeWorkflow(...)`:** A missed fire (server crash after insert, before workflow starts) would leave the overtime request without a workflow. On client retry, the `duplicate` check at the top of `createRequest` throws `ConflictException`, preventing a second workflow start. The miss is recoverable by manual re-trigger. Not fixed: adding `registerAfterCommit` requires the workflow service to be safe under a deferred call — no evidence it is.

**`crm-validation-rules.service.ts` / `crm-blueprints.service.ts` — `void this.auditLog(...)`:** Audit log failures are always fire-and-forget here (audit is a best-effort side effect). Swallowed errors are the design. Not a write-path correctness bug.

## Files Changed

| File | Change |
|------|--------|
| `src/modules/accounting/core/accounting-payables.service.ts` | `void` → `await` on `postApFxGainLoss`; inner `.catch()` → `await` on `postRealizedGainLoss` |
| `src/modules/invoices/invoices-payment.service.ts` | `void` → `await` on `postArFxGainLoss`; inner `.catch()` → `await` on `postRealizedGainLoss` |
| `src/modules/leads/lead-conversion.service.ts` | Non-atomic ticket number replaced with `allocateTicketNumbers`; idempotency guard added; unused `users` import removed |
| `src/modules/accounting/posting/fx-posting-idempotency.spec.ts` | NEW — 3 retry-safety tests |
| `src/modules/leads/lead-conversion-ticket-idempotency.spec.ts` | NEW — 3 retry-safety tests |
