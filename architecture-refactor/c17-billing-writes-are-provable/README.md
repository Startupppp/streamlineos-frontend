# c17 — Every billing write is provable

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 0** · 7 tickets, 5 retired.

The adapter shipped with c5 and the architecture is right. What is missing is proof that individual writes happened. Every defect here has the same shape: **a mechanism that looks like enforcement and is not** — and each fails permissively, in the direction of letting the request through, which on a billing path means revenue loss rather than an error someone notices.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | A provider event is recorded before it is acted on | — | ✅ **done** — event recorded before any business logic, deduped on (provider, event id). The insert runs in an explicit tenant transaction: the route is @Public() so no GUC is set, and the new table has RLS |
| 02 | A webhook acknowledges only durable work | 01 | ✅ **done** — fire-and-forget credit grant replaced by ExternalEffectLedger; a failed grant returns 503 so the provider retries instead of the payment being lost silently |
| 03 | A coupon can be used once | — | ✅ **done** — already shipped in 0473; verified, not rebuilt |
| 04 | A quota that cannot be computed refuses the write | — | ✅ **done** — an unresolvable plan limit now denies instead of letting the write through |
| 05 | Revenue reporting reads what the system writes | 01 | ✅ **done** — the write path was made canonical (analytics kept, not deleted); new_subscription recorded on activation |
| 06 | [Dunning history is queryable](issues/06-dunning-history-is-queryable.md) | — | in-progress — table write on PAST_DUE transition done; cron JSONB write needs out-of-scope update |
| 07 | An issued invoice cannot change | — | in-progress — DB trigger enforces financial-field immutability (0492); credit notes not yet wired |

## Working these

Work the frontier — any ticket whose blockers are all done. A ticket marked `—` under **Blocked by** can start immediately.

Every ticket is a vertical slice: it cuts a narrow but complete path through schema, API, UI and tests, and is verifiable on its own. None is a layer.

Acceptance criteria are the contract. The **Todo** list is a suggested route and may be ignored if a better one exists — the criteria may not.
