# 22: Move Expense side effects to the outbox

**What to build:** Expense notifications and integrations occur after the business transaction commits and survive process or provider failure.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Business state and outbox intent commit atomically.
- [x] Consumers retry idempotently and dead-letter terminal failures.
- [x] No unobserved fire-and-forget promise remains in owned Expense paths.
- [x] Commit/rollback/retry and duplicate-delivery tests pass.

## What was wrong

`ExpensesWriteService.create` and `ExpensesWriteService.updateStatus` ended with
`void this.dispatchExpenseSubmitted(...)` and `void this.dispatchExpenseDecision(...)`.
Both spawn an unawaited promise that keeps the request's AsyncLocalStorage context but
runs after the request transaction has committed — the pooled handle is released and the
transaction-local tenant GUC is gone, so every read and write inside them dies `42501`
under live RLS. Both were wrapped in a `try/catch` that swallowed the failure into
`logSideEffectFailure`, so the approver was never notified and nothing said so. This is
the exact class of defect that produced zero `notifications` rows platform-wide across
~50 call sites.

`ExpenseLifecycleService.rejectExpense` additionally wrote the expense row and its
`fin_approval_requests` row as two separate un-transacted updates, so a crash between them
left a REJECTED expense with a still-PENDING approval request.

## What changed

| File | Change |
|---|---|
| `backend/src/modules/expenses/dto/expense-outbox.schemas.ts` | new — `expense.submitted` / `expense.decided` event constants, Zod payload schemas, decision→catalog-key map, aggregate-version helper |
| `backend/src/modules/expenses/expense-outbox.consumer.ts` | new — `ExpenseSubmittedConsumer` and `ExpenseDecidedConsumer`, both registering in `onModuleInit` and fencing on `InboxConsumer` |
| `backend/src/modules/expenses/expenses-write.service.ts` | `create` now runs in a transaction and emits inside it; `updateStatus` emits inside its existing transaction; both `void` dispatches and their private methods deleted |
| `backend/src/modules/expenses/expense-lifecycle.service.ts` | `submitExpense`, `approveExpense` and `rejectExpense` emit inside the business transaction; `approveExpense` and `rejectExpense` gained the transaction they lacked; `NotificationDispatchService` dependency removed |
| `backend/src/modules/expenses/expenses.module.ts` | imports `OutboxModule`, registers both consumers |
| `backend/src/modules/expenses/expense-outbox.spec.ts` | new — 14 tests |

Behaviour is preserved rather than unified. The two submit paths genuinely differ today —
`create` resolves approvers by permission and runs automations, `submitExpense` notifies the
policy approver and does not — so the payload carries an explicit discriminated
`recipients` mode and a `runAutomations` flag instead of silently changing either path.

## Verification

`node ./node_modules/jest/bin/jest.js src/modules/expenses/` (backend):

```
PASS src/modules/expenses/travel.service.spec.ts
PASS src/modules/expenses/expense-outbox.spec.ts (8.129 s)

Test Suites: 2 passed, 2 total
Tests:       19 passed, 19 total
```

The 14 new tests, by criterion:

- **Atomicity** — `commits the expense row and its outbox event on the same transaction
  handle` asserts both inserts land on the identical `tx` object handed to the transaction
  callback; `rolls the business write back when the outbox insert fails` asserts the caller
  sees the error and only the expense insert was attempted. The `db.transaction` double
  invokes its callback, so these assertions are not silently void.
- **Idempotent retry / dead-letter** — `suppresses a duplicate redelivery of the same
  producer event` (second `InboxConsumer.claim` returns false, nothing dispatched),
  `reclaims a previously failed delivery so the relay retry does real work`, and `marks a
  delivery FAILED and rethrows so the publisher retries then dead-letters`. Backoff and the
  ceiling itself are the shared publisher's (`OUTBOX_RETRY_BASE_MS` 1 s doubling to a 60 s
  cap, `OUTBOX_MAX_RETRIES` 8), already covered by `outbox-envelope.spec.ts` and
  `outbox-publisher.service.spec.ts`.
- **Duplicate delivery** — the dedupe key asserted is
  `outbox:<org>:expenses:submitted:<eventId>`, stable across every retry of the same
  producer event, so a redelivery collapses onto one notification outbox row.
- **No fire-and-forget** — a scanner over the five owned expense service files asserts no
  `void this.*` and no swallowing `.catch(() => {})` remains, plus an anti-vacuity test
  proving the scanner reports an offender when one exists and a test proving it actually
  read the files it claims to scan.

Runtime proof that the consumers are reachable — an unregistered event type would make the
publisher throw `no dispatch handler` and dead-letter every expense event. Booting the real
`AppModule` and querying the live registry:

```
PROBE expense.submitted -> ExpenseSubmittedConsumer
PROBE expense.decided -> ExpenseDecidedConsumer
PROBE chat.message.fanout -> ChatFanoutOutboxConsumer
PROBE no.such.event -> NOT REGISTERED
```

The fourth line is the negative control: the probe can report absence, so the first two
lines are a measurement rather than a formality.

`tsc --noEmit` over the backend reports no error in any file changed here. Errors reported
elsewhere in that run belong to files sessions S1–S4 are editing concurrently
(`ai/core/services/meetings-prep.service.ts`, `ownership/__tests__/ownership.service.spec.ts`,
`users/user-ops-bulk-update.spec.ts`) and are not this ticket's.

Committed as backend `3f15ff65`, six paths, staged entries belonging to other sessions
left untouched (23 before, 23 after).

## Not done here

`emailReport` still awaits `EmailService.sendMonthlyExpenseReportEmail` inside the request.
That call is observed rather than fire-and-forget, so it does not breach criterion 3, but it
is a synchronous provider call on the request path and its unbounded `findMany` is ticket 21
(session S2). Recorded in `CROSS-SESSION.md` rather than changed here.
