# c14 · Background sweeps operate on sets, not on rows

**Status: not started; the scope is smaller than it looks.** Verified at source 2026-08-25. 126 `for…of` loops contain an awaited database call. Classified by *what is iterated* — the only thing that decides whether N is bounded — **57 iterate a database read** and grow with tenant data. The rest iterate request payloads (16, DTO-capped), derived grouping keys (11), or constants (6). The worst is nested and runs inside `forEachOrg`, so it multiplies by tenant count.

## Problem Statement

**As an operator, background jobs get slower as the business grows, and nobody notices.** Sweeps run on a schedule and report success. A job taking three seconds at fifty employees takes minutes at five thousand, and the only symptom is a cron run that quietly takes longer each month.

**As an operator, a sweep failing halfway leaves partial work.** Per-row transactions mean a job that dies at row 300 of 500 has committed 300 changes. Re-running either duplicates them or requires the job to be idempotent by luck.

**As a user, monthly leave accrual is the worst of these.** For each accrual policy it re-fetches the entire member list — identically every time, because the organisation never varies inside the loop — then per member issues an existence check, a balance read, and its own transaction. One organisation with five policies and five hundred employees: five redundant full member fetches, five thousand reads before a single write, and up to two and a half thousand transactions. All of it inside `forEachOrg`.

**As an operator, these jobs exhaust the connection pool.** Every request and job holds a transaction for its full life. A sweep opening thousands of short transactions competes with live traffic for a small pool.

**As a developer, a loop containing a query looks harmless.** It reads naturally and is correct. Nothing distinguishes a loop over three currencies from a loop over every employee, so the pattern spreads.

## Solution

Convert the 57 tenant-growing loops to set-based operations. The transformation is mechanical and the same in nearly every case:

- **Hoist reads that do not vary with the loop.** The leave accrual member fetch is the clearest — it is identical on every iteration.
- **Replace per-row existence checks with one `inArray`.** Fetch the set, compare in memory.
- **Replace per-row writes with one bulk statement**, using `onConflictDoNothing` where the loop was really an idempotency guard.
- **Replace per-row transactions with one transaction per batch**, so a failure rolls back a batch rather than stranding half a run.

Scope by evidence: **do not convert the 33 bounded loops.** A loop over three currencies or over a validated payload is not a defect, and changing it adds risk for nothing.

## User Stories

1. As an operator, I want a sweep's cost to grow with the work done, not with the rows examined, so that it stays viable as tenants grow.
2. As an operator, I want monthly accrual to complete in seconds, so that it does not overlap the next scheduled run.
3. As an operator, I want a failed sweep to leave no partial work, so that re-running is safe.
4. As an operator, I want a sweep re-run to be idempotent, so that a retry cannot double-credit anyone.
5. As an operator, I want a sweep to release database connections promptly, so that background work does not starve live traffic.
6. As an operator, I want a sweep that fails to say which tenant and which record, so that I can act without reproducing it.
7. As an operator, I want one tenant's failure not to abort the rest, so that a single bad record does not stop the run.
8. As an operator, I want to know how long each sweep took, so that growth is visible before it becomes an incident.
9. As an employee, I want my monthly leave accrued exactly once, so that my balance is correct.
10. As an employee, I want accrual to respect the policy ceiling, so that a batch rewrite does not over-credit me.
11. As an employee, I want accrual to skip me correctly when I am inactive or on probation, so that batching does not lose a rule.
12. As a finance operator, I want payment-run processing to scale with the run, so that a large run does not time out.
13. As a developer, I want a documented way to write a sweep, so that the next one is set-based by default.
14. As a developer, I want to know which loops are bounded, so that I do not rewrite code that is already correct.
15. As a developer, I want batch sizes explicit, so that a bulk write cannot exceed parameter limits.
16. As a reviewer, I want a new loop containing a query to be justified, so that the pattern does not return.

## Implementation Decisions

**Already shipped — the surrounding machinery is fine**

- **`forEachOrg` is the correct tenant iterator** and stays. The defect is inside the callback, not in the iteration.
- **`runInNewTenantTransaction` exists** for deferred work needing its own context.
- **Bounded loops stay.** Currency groups, validated payload lines, constant lists. Rewriting them is churn.

**To build**

- **Fix leave accrual first.** It is the worst by a wide margin and every technique appears in it: hoist the invariant member read, collapse the existence check into one `inArray` over the period, batch the balance read, and replace per-member transactions with one bulk `insert … onConflictDoNothing` plus one set-based update.
- **The accrual ceiling must survive batching.** The per-row version clamps to `maxBalance` in application code. A set-based update has to express the same clamp in SQL, and getting it wrong over-credits people — this is the one place in this spec where a mistake is visible to employees.
- **Then the six other loops with more than three calls per iteration**, including the payment-run loop at seven calls per row inside a transaction.
- **One transaction per batch, not per row.** Batch size explicit and stated, chosen to stay well inside parameter limits.
- **Bulk writes are idempotent.** `onConflictDoNothing` against the natural key, so a retry after partial failure is safe — which is what the per-row existence check was really doing.
- **A per-tenant failure is logged and the sweep continues.** One tenant's bad data must not stop the rest.
- **Errors log their cause.** A driver-level failure inside a template raises a message that says nothing useful on its own; the cause is where the actual error lives, and a sweep that swallows it can fail for every tenant while reporting success.
- **Duration is recorded per sweep per tenant**, so story 8 is answerable without adding an APM.
- **Sweeps get read budgets** where their queries are the growing part, per c11.

## Testing Decisions

**What makes a good test here.** Assert the outcome of the sweep — final balances, rows written, rows skipped — never the number of statements. A test asserting query counts locks in an implementation; a test asserting balances survives the rewrite, which is the entire point.

- **Behaviour is preserved.** For a fixture of employees spanning active, inactive, probationary, at-ceiling, already-accrued and never-accrued, assert final balances match the per-row implementation exactly. This is the test that makes the conversion safe.
- **Idempotency.** Running a sweep twice produces the same state as running it once. This is the property the existence check provided and the one most easily lost.
- **Partial-failure recovery.** Fail a batch mid-run, re-run, assert no duplicates and no gaps.
- **Ceiling clamping.** An employee at `maxBalance` gains nothing; one just below gains the remainder, not the full rate. Story 10, and the likeliest regression.
- **Per-tenant isolation.** A tenant whose data causes a failure does not prevent the others being processed.
- **The transaction mock must invoke its callback.** A bare `jest.fn()` for `db.transaction` never runs the body, so every assertion inside silently passes. This has bitten this codebase more than once; assert the callback ran.
- **Prior art**: the existing cron service specs, and the payroll run specs which already assert final monetary state rather than statement counts.

## Out of Scope

- The 33 bounded loops.
- Moving sweeps to a queue or worker. `forEachOrg` plus the scheduler is the current architecture and this spec does not change it.
- The transactional outbox, which is c9's and is now wired.
- Request-path N+1. Only three parallel fan-out sites exist and none is on a hot path.
- Table partitioning.

## Further Notes

The classification is the useful part of this spec and it is worth preserving. A raw scan reported **155** loops; classifying by what is iterated cut it to **57**. The 98 difference is not noise — it includes loops that look exactly like defects and are not, such as a five-query loop over currency groups bounded at about three.

Reporting the raw number would have sent someone after work that does not exist. The rule generalises: **a loop containing a query is only a defect if the collection grows with tenant data**, and that is a question about where the collection came from, not about the loop.
