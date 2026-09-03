# 35f — FIN-TAX-WINDOW fixed, and the swallowed-failure sites triaged

Follow-on to `35e-vacuity-sweep-s13.md` §11 items 3 and 4. 35e's analysis is not redone here; its
consequence column is checked against the source, and **three of its entries are corrected**.

**Headline.** `FIN-TAX-WINDOW` is fixed and proved by walking a calendar rather than by a stubbed
value. Of the 10 swallowed-failure sites 35e actually names, **3 were accidental and are fixed
(4 files, 3 commits, all bite-proved in both directions); 1 is deliberate, documented and correct;
6 are deliberate-in-shape but wrong for what they now guard, and are escalated with the specific
evidence.** Nothing was reclassified downward to look productive, and nothing on a money path was
changed by guess.

Bite proving was done in hermetic `git archive HEAD` trees under the session scratchpad. No mutation
was ever written to the shared working tree.

---

## 1. FIN-TAX-WINDOW — fixed

`src/modules/finance/tax/tax-compliance.service.ts`. Commit **`99c52ebd`** (backend).

The filing period is the previous month (`prevMonthStart`..`prevMonthEnd`), but the GSTR-1/3B
deadlines were computed for the month **after today**. For a period ending in month M the deadlines
fall on the 11th and 20th of **M+1**; the previous month's M+1 is the **current** month, not the
next one. The old arithmetic put them a month late, so the nearest deadline the code could produce
was 11 days out against `DUE_WARNING_DAYS = 5` and `checkTaxDue` returned `[]` before any query.
`cron/cron-finance.service.ts` calls this sweep, so the GST due-date notification had never fired.

```
const monthStr = String(month + 1).padStart(2, "0");   // was: nextMonth + 1, with a year roll
const gstr1Due = `${year}-${monthStr}-11`;
const gstr3bDue = `${year}-${monthStr}-20`;
```

**A second defect in the same arithmetic, found by the date walk.** The period bounds were built
with the *local* `Date` constructor and then serialised with `toISOString()`. Under this machine's
`Asia/Calcutta` (UTC+5:30), local midnight is the previous UTC day, so the emitted filing period
read one day short at **both** ends — `2027-10-31 to 2027-11-29` where the period is
`2027-11-01 to 2027-11-30`. Both bounds now derive from `Date.UTC`, matching the UTC `todayIso` the
same function already computed. Nobody had ever seen this string because the sweep never reached
the emit.

### The proof is a calendar walk, not a stub

`src/modules/finance/tax/tax-compliance-due-window.spec.ts` (new). It pins `jest.setSystemTime`
across **400 consecutive days** from 2027-12-01 — covering a December→January roll and a leap
February — driving the real service on each one and recording whether the window opened, both
deadline strings, both distances, and the emitted period. Seven assertions over the walk, including
that the window opens exactly when a deadline is within the threshold or past it, that both
deadlines land in the month of the sweep, and that the period is the whole previous calendar month.

35e's sibling spec stubbed `daysBetween` to `3` in every test — a value the real arithmetic could
not produce in that call context. A stub cannot see this class; only walking the calendar can.

### Bite proofs, both directions

| Tree | Run | Result |
|---|---|---|
| HEAD service + new specs | `jest --testPathPattern="finance/tax/tax-compliance"` | **rc=1**, 5 failed / 18 passed — `opens on real days` measured **0 of 400 days**, `opens exactly on the days…` reported **334 of 400 wrong** |
| fixed service + planted local-time period bounds | same | **rc=1**, 2 failed / 21 passed — `2027-12-06 -> 2027-10-31 to 2027-11-29` |
| fixed service + new specs | same | **rc=0**, 23 passed / 4 suites |

`tax-compliance-tenant-isolation.spec.ts`'s fourth test characterised the defect (asserting the
window stays shut on the eve of a deadline) and had to be inverted: it now asserts the sweep runs
for the owning org on 2026-09-10 with `gstr1DueDate = 2026-09-11` and `daysUntilGstr1 = 1`, and a
sibling asserts it does not run on 2026-09-05.

**Residual, not changed, flagged as a product question.** The guard is
`if (gstr1Days > 5 && gstr3bDays > 5) return []`, and a *past* deadline yields a negative distance,
which is also `<= 5`. So with the fix the window is open on days 6–31 of every month, and the 7-day
dedupe TTL means roughly four notifications per org per month. That is the guard as written; making
it close on the far side of a deadline changes when a tax notification fires, which is the product
decision 35e correctly declined to take. The date-walk test pins today's behaviour precisely, so
changing it is a one-line edit with a failing assertion naming the new shape.

---

## 2. The triage — how many sites there actually are

35e §8 says "14 swallowed-failure sites" and its table numbers rows 2 through 15. Counting distinct
`file:line` entries, **the table names 10**; ranks 10–14 appear nowhere in the report or anywhere
else under `reports/`. I triaged the 10 that are named. **Five ranks are unaccounted for and I did
not re-run the sweep to find them** — that is 35e's to reconcile.

### The split

| Class | Count | Sites |
|---|---|---|
| **(a) accidental swallow — FIXED** | **3** | payroll-inputs `:201`/`:221` (one unit), leaves-write `:387`, overtime `:188` |
| **(b) deliberate, documented, correct — left alone** | **1** | `jwt-auth.guard.ts:229` |
| **(c) deliberate but wrong for what it now guards — ESCALATED** | **6** | ai-gateway-credit `:168`, command-fence-store `:123`, payment-run-executor `:276`, accounting-payables `:451`, frontend `lib/auth.ts:254`, and the *unnamed* ranks 10–14 as a class |

Counting the two payroll sites separately, as 35e does, category (a) is 4 sites in 3 files.

---

## 3. Category (a) — fixed

### 3a. `hr/payroll-inputs/payroll-inputs.service.ts:201, :221` — commit `7ac66b9d`

`lockPeriod` flips the period to `locked`, freezes the leave ledger for the period and stamps every
due loan installment `deducted`, **inside one `db.transaction`**. Both companion writes carried
`.catch(() => undefined)`, which defeats the transaction: on a failure the callback returns
normally, the transaction **commits**, the period is audited as locked and immutable, and the
installments stay `pending` — so the next period's lock picks them up and deducts the same
installment a second time from the employee's pay.

There is no comment, and the same file's `buildPeriod` compensates explicitly on failure (it
reopens the period, and logs if the compensation itself fails), so the author of that method knew
the pattern. These three did not.

**The fix is to let the transaction fail, not to add a second write** — the three writes are one
atomic act. A third instance at `:307` in `unlockPeriod` had the same catch on the ledger thaw,
which let a period reopen over a ledger still marked `locked`; removed with the other two.

Proof: `src/modules/hr/payroll-inputs/__tests__/payroll-inputs-lock-atomicity.spec.ts` (new) fails
the loan-installment write, the leave-ledger write and the unlock thaw with a
`DrizzleQueryError`-shaped error (`PostgresError` on `.cause`, `constraint_name`/`table_name` — the
shape `src/common/db/postgres-error.ts` documents, not the `{ code }` fake the repo keeps hitting),
and asserts the transaction callback never returns, the audit entry is never written and the
automation event never fires. A fourth test is the success control and asserts all three tables are
updated in order.

| Tree | Result |
|---|---|
| HEAD service + new spec | **rc=1**, 3 failed / 20 passed |
| fixed service + new spec | **rc=0**, 23 passed / 4 suites |

### 3b. `hr/time/leaves-write.service.ts:387` and `hr/time/overtime.service.ts:188` — commit `0314ac4d`

**35e's consequence is overstated and I am correcting it.** It says the request "never reaches an
approver". It does. Approval for both leave and overtime is a **direct status flip on the request
row** (`PUT /hr/leaves/:leaveId/approve` → `LeavesApprovalService.approve`;
`PATCH /hr/overtime/:overtimeRequestId/approve` → `OvertimeService.approveRequest`), and the
approver's list (`GET /hr/leaves/team`, `GET /hr/overtime`) reads the request tables directly. There
is no `workflow_instance_id` column on `leave_requests` or `overtime_requests`, and nothing anywhere
maps an approved `hr_workflow_instances` row back onto a request's status. The workflow instance is
a parallel, advisory record.

What the swallow actually costs:

1. **The workflow console goes blind.** `GET /hr/workflows/instances/inbox`, the instance timeline,
   and the SLA escalation sweep (`sweepOverdueSteps`) all read `hr_workflow_instances`, and
   **nothing in the repository ever creates a missing one** — no cron, no reconciler, no backfill.
   The gap is permanent.
2. **Every failure it ate was a real one.** `startWorkflow` does **not** throw when no definition is
   configured: it inserts a synthetic auto-approved instance (asserted by
   `hr-workflow-engine.spec.ts`). So the catch was never covering a normal "no workflow configured"
   condition — only DB, transaction and tenant-context failures, logged nowhere.
3. **Overtime was firing on a dead handle.** `void this.startOvertimeWorkflow(...)` ran inside the
   request after the insert, with no `registerAfterCommit` and no new tenant transaction — exactly
   the pattern `backend/CLAUDE.md` §4 names as the cause of "zero `notifications` rows platform-wide
   across ~50 swallowed call sites". Under RLS the GUC is gone by then and the write dies `42501`,
   into the empty catch.

**The right fix here is a compensating action, not propagation.** The request row has already
committed; propagating would either 500 a successful submission or — in the leave path, where
`scheduleLeaveRequested` awaits the workflow start *before* the notification dispatch inside one
`runInNewTenantTransaction` — suppress the `hr.leave.requested` notification as well. So both sites
now log through `logSideEffectFailure`, the repo's existing helper, matching the in-repo precedent
at `hr/forms/hr-forms-submissions.service.ts:158`. Overtime additionally moved onto
`registerAfterCommit` + `runInNewTenantTransaction`, as leave already did.

The two notification dispatches in the same file (`dispatchLeaveRequested`,
`dispatchLeaveCancellation`) carried the identical empty catch and would have eaten the failure
before the newly-logging outer catch could see it; both now log. That is one function chain, not a
new finding.

Proof: `src/modules/hr/time/hr-time-workflow-side-effects.spec.ts` (new) — four tests asserting the
overtime start is deferred to an after-commit hook running in its own tenant transaction, and that
a rejected `startWorkflow` and a rejected notification `emit` each produce a `logger.warn` naming
the failure while the hook still resolves.

| Tree | Result |
|---|---|
| HEAD services + new spec | **rc=1**, **4 failed / 4** |
| fixed services + new spec | **rc=0**, 48 passed / 5 suites (incl. the 3 pre-existing hr/time suites) |

---

## 4. Category (b) — deliberate, documented, correct

### `common/auth/jwt-auth.guard.ts:229` — leave it

The six-line comment above `isRevokedInDatabase` is accurate: Redis holds the revocation tombstone
and is a cache, the `user_sessions.is_revoked` read is the durable fallback, and **only a double
failure** — Redis unavailable *and* the database read throwing — returns `null`, after which the
caller treats the session as live. The `catch` logs at `error` level with the cause.

This is a deliberate availability-over-security trade with a written rationale, and flipping it to
fail-closed would turn a double outage into a **total authentication outage for every request**,
which is strictly worse than the exposure it removes. I did not touch it.

**The exposure, stated for the record so the decision is made with it in view:** during a
simultaneous Redis and Postgres failure, a session revoked before the outage authenticates for the
remaining life of its JWT. `backend/CLAUDE.md` §4 already states the coupled fact — "Session
revocation needs the Redis tombstone … a DB `isRevoked` flag alone logs nobody out" — so the DB
fallback is the *second* line, not the first. Whether that window is acceptable is a **security
product decision**, and the only thing missing is that it has never been taken explicitly. Owner:
auth / security.

---

## 5. Category (c) — deliberate in shape, wrong for what they now guard

### 5a. `common/idempotency/command-fence-store.ts:123` — the fence, and what is behind it

The comment is correct about the mechanism: "a lost completion write just means the next retry
re-executes after the lease". The question the comment does not ask is what re-executing costs.

Lifecycle, read off the source: the interceptor claims the lease **before** the handler with an
`INSERT … ON CONFLICT DO NOTHING` (`status=IN_FLIGHT`, `lease_expires_at = now+60s`,
`expires_at = now+24h`), and stamps `COMPLETED` only in the RxJS `tap({next})` **after** the handler
emits. Both writes are fire-and-forget `void`, and `complete()` swallows everything. On a retry with
no `COMPLETED` stamp, `claim()` compare-and-swaps the expired lease and returns `proceed` — **the
handler body executes a second time for real.** So the window is: any retry arriving more than 60
seconds after the first attempt, whenever the completion write was lost.

**What sits behind `@Idempotent`: 245 handlers across 100 controllers.** Classified by whether
re-execution is harmful:

- **28 where it is harmful and the fence is the only thing stopping it.** The money ones:
  `POST /finance/transfers` (the transfer row has no conflict target and both balance updates are
  unconditional `± amount` — **the cash moves twice**); `POST /invoices/:invoiceId/payments` (a
  duplicate *partial* payment passes the outstanding-balance guard and is recorded and posted
  twice); `POST /accounting/vendor-payments/allocations` (`amount_paid + v.amount` double-credits
  the bill); `POST /accounting/recurring-bills/:templateId/run-now` and
  `.../recurring-invoices/:templateId/run-now` (a fresh AP liability / AR invoice per call);
  `POST /accounting/payment-runs` (a second run over the same bills — approve both and the vendors
  are paid twice); `POST /billing/checkout` and `/billing/addons/purchase` (a provider-side order
  per call); `POST /accounting/credit-notes`; `POST /hr/payroll-inputs/adjustments` (a second
  adjustment that gets paid). The external ones: `POST /mail/send` and `/mail/reply` (a second real
  email), `POST /notifications/dispatch` (duplicate email + Twilio SMS/WhatsApp, duplicate carrier
  spend), `POST /users/:userId/send-signin-link` (a second live magic-link token),
  `POST /sign/envelopes/:id/resend`, `/sign/bulk-send/jobs`, `POST /webhooks/.../retry`,
  `POST /payroll/runs/:runId/payslips/publish` (re-emails every payslip).
- **~37 where the service refuses or dedupes a second run on its own** — a status guard, a unique
  constraint, or its own idempotency key. `payment-runs/:runId/execute` (`status !== "APPROVED"` →
  409), `reimbursements/:batchId/pay` (returns `{replayed:true}`), the tax-payment `reference`
  unique, `uniq_je_idempotency` on recurring journals, `uq_ai_credit_txns_purchase_ref`, and the
  five export routes that persist the `Idempotency-Key` themselves.
- **~180 benign** — guarded state transitions, upserts, and inserts of non-financial records.

**Verdict: best-effort is the wrong choice for the 28.** For those routes the fence *is* the
guarantee, and a silent lost completion write converts a retry into a double charge. Note also that
the catch is entirely **silent** — no log line at all — so a systemic failure of completion writes
(a pool exhausted right as handlers finish) would double-execute money commands invisibly.

**Recommendation, in order of cost:** (1) log the failure at `error` — this alone costs nothing and
is the difference between an invisible and a diagnosable incident; (2) retry the completion write
with a short backoff before giving up; (3) for the 28, stop relying on the fence alone — every one
of them should carry its own natural key or status guard, which is what the other 37 already do. I
did not change it: turning a swallowed completion write into a failure changes the response of a
command that succeeded, and that is a platform decision. Owner: platform / idempotency.

**Two structural notes found while enumerating, both new:** the `requestHash` covers
`{commandName, body}` only, **not the path params** — so a client reusing one key across
`/credit-notes/:a/post` and `/credit-notes/:b/post` with an empty body gets the first response
replayed instead of the second acting; and the interceptor **silently skips the fence entirely**
when `req.user.orgId` is absent, which leaves portal/public `@Idempotent` routes such as
`support:portal_ticket.create` unprotected.

### 5b. `ai/core/gateway/ai-gateway-credit.helper.ts:168` — the loss is real but not the one named

35e says "unbilled inference". Reading the ledger, that is only half right, and which half depends
on something that is not wired.

`reserve` **debits the wallet up front** by the catalog ceiling estimate and writes an
`ai_credit_reservations` row (`status=RESERVED`, `expires_at = now + 15 min`); no
`ai_credit_transactions` row yet. `settle` refunds the over-estimate or debits the overage, writes
the `USAGE` transaction row, and marks the reservation `SETTLED`. So when `settle` throws into this
catch:

- **Today, with nothing scheduling the sweep:** the org's visible balance stays down by the reserve
  **ceiling** with **no transaction row to explain it** and `lifetime_consumed` never incremented —
  the customer's history no longer sums to their balance. That is a silent **over**-charge, the
  opposite direction from 35e's reading.
- **If someone wires the sweep:** `sweepExpiredReservations` refunds the **full** estimate and marks
  the row `RELEASED (reason: expired)` — the org is charged nothing for a call that really consumed
  tokens. That is 35e's revenue loss, and a spec comment in
  `__tests__/ai-gateway-stream.helper.spec.ts` already acknowledges it under-charges.

Either way `usageSvc.track(...)` still runs after the catch recording `creditsMilli: actualMilli`,
so `ai_usage_logs` claims credits were consumed while the credit ledger has no matching row, with
**nothing reconciling the two**.

The compensator exists in code and is not scheduled: `sweepExpiredReservations` is reachable only as
`GET|POST /cron/ai-reservations-sweep` behind `CRON_SECRET`; there is **no `@Cron` anywhere in
`src`**, the in-process `CronRetentionSchedulerService` registers 13 retention jobs and not this
one, and the README's external-scheduler contract lists five jobs, none of them this. There is no
retry, no outbox row, no DLQ, and no idempotency key on `settle` (only on `reserve`). Three sibling
sites swallow the same way: `ai-gateway-credit.helper.ts:51` via its callers,
`ai-gateway-embed.helper.ts:209`, and the stream settles in `ai-gateway-stream.helper.ts:170`,
`kb-rag.service.ts:216`, `chat-assistant.service.ts:236`.

**Recommendation:** the settle is `backend/CLAUDE.md` §4 mechanism (2) — an effect that leaves the
aggregate where losing it is a correctness bug — so it belongs on the **outbox**, not on a catch.
Failing that, the sweep must settle at actual usage rather than refund in full, and it must actually
be scheduled. Not changed: this moves money. Owner: AI gateway / billing.

### 5c. `finance/ap/payment-run-executor.service.ts:276` and `accounting/core/accounting-payables.service.ts:451` — the FX pair

Both `try` blocks wrap **two different failures with one handler**: `rateResolver.getRate`, which
throws on a legitimately missing rate, and `fx.postRealizedGainLoss`, which is the **journal write**.
The payables message even reads `"No exchange rate for FX on purchase_bill ${bill.id}"` — the author
was thinking about `getRate` and did not notice the post was inside the same block. A failed GL post
is logged as a missing rate and the trial balance silently does not tie.

**Propagation is the wrong fix and I did not apply it.** Both FX posts run *after* the payment
transaction has committed: in payables the payment row is already inserted and the bill balance
already moved, so throwing 500s a request whose money movement succeeded; in the payment run the
enclosing `catch` would mark the item `SKIPPED` after the vendor payment had already committed,
which is worse than the current state. The correct remedy is durable — an outbox row for the FX post
so it retries, plus a reconciliation query for the backlog:

```sql
-- purchase bills paid in a non-base currency with no realized-FX journal
select p.id, p.bill_id, p.payment_date
from vendor_payments p join purchase_bills b on b.id = p.bill_id
where b.currency <> (select base_currency from accounting_settings s where s.org_id = b.org_id)
  and not exists (select 1 from <je table> j
                  where j.source_type = 'purchase_bill' and j.source_id = b.id::text
                    and j.source_event like '%fx%');
```

Not changed for two reasons: restructuring GL posting is a design change on a money path, and both
files sit inside the active accounting rewrite lane (`feat/accounting-module` absorbs `finance/` and
`accounting/` onto the `gl_*` kernel), so a structural edit on `main` would conflict with it. At
minimum the two failures must stop sharing a handler. Owner: finance/accounting release owner.

### 5d. `frontend/lib/auth.ts:254` — the degraded session

The `try` wraps the **whole** NextAuth `session` callback: the live `fetchSessionDataCached` read
*and* the backend-JWT exchange. On any failure the catch rebuilds the session from the JWT and
returns it with **no `backendJwt`**, no `enabledModules`, no `plan`, no `branchId`. There is no
comment and no log of any kind.

The dominant consequence is the one 35e names: the client renders as fully signed in and **every**
backend call goes out unauthenticated (`lib/server-fetch.ts:47`, `lib/api-client.ts`), so the user
sees a working shell where nothing loads, with zero signal anywhere that the session is degraded.

**One correction to 35e's framing.** It points at `isActive ?? true` as the fail-open. Following the
consumer, `lib/rbac/require-permission.ts:30,44` gates on `session.user.isActive === false` — so
`undefined` already passes. Changing the `?? true` would move nothing; the fail-open lives in the
`=== false` gate, not in the catch. The genuinely asymmetric part is smaller than it looks: the
success path assigns `fresh?.isActive ?? (token.isActive as boolean)`, which can be `undefined`,
while the catch path forces `true` — so the degraded session is *more* permissive than the healthy
one, which is backwards, but neither reaches the gate differently.

**Not changed**, because the two available remedies are both product decisions: mark the session
degraded so the UI can render "reconnecting" instead of a broken app, or let the callback fail
closed and bounce to sign-in — the second signs everyone out on a backend blip. Either is a better
answer than a silent shell. The frontend's near-zero-`console` posture means the observability fix
should go through NextAuth's own `logger.error` option rather than an ad-hoc call. Owner: frontend
auth. **I touched no frontend file, so `pnpm -C frontend type-check` was not run for this work**;
35e already recorded it red at 2 pre-existing errors in `hooks/api/chat-core-read.ts`.

### 5e. Ranks 10–14 — unnamed

35e's §8 table says 14 sites and names 10. Ranks 10–14 do not appear in the report or anywhere under
`reports/`. They cannot be triaged from what is written down, and I did not re-run the sweep to
recover them. **Owner: 35e, to reconcile the count against its own table.**

---

## 6. Gates

All run in this repository, exit codes captured with `$?`, never a pipe.

| Gate | Command | Exit | Number |
|---|---|---|---|
| BE typecheck | `pnpm typecheck` | **0** | exit code, not a grep — a crashed `tsc` greps as "0 errors" |
| BE spec typecheck | `pnpm check:spec-typecheck` | **0** | spec-inclusive typecheck passed |
| BE vacuous assertions | `pnpm check:vacuous-assertions` | **0** | 1,928 spec files · 14,806 callbacks · 55,570 `expect()` · 4 registered, all ratchets held |
| Focused jest, every module touched | `jest --runInBand --testPathPattern="(modules/finance/tax\|hr/payroll-inputs\|hr/time\|modules/cron/)"` | **0** | **80 suites / 552 tests passed** |
| FE type-check | — | **not run** | no frontend file was changed |

Bite proofs, per §1 and §3, each in a fresh `git archive HEAD` tree: tax **5 failed → 0**, payroll
**3 failed → 0**, hr-time **4 failed → 0**.

## 7. Commits (backend repo, branch `main`)

| SHA | Files | What |
|---|---|---|
| `99c52ebd` | `tax-compliance.service.ts`, `tax-compliance-tenant-isolation.spec.ts`, `tax-compliance-due-window.spec.ts` | FIN-TAX-WINDOW + the UTC period bounds + the 400-day walk |
| `7ac66b9d` | `payroll-inputs.service.ts`, `__tests__/payroll-inputs-lock-atomicity.spec.ts` | three transaction-defeating catches removed |
| `0314ac4d` | `leaves-write.service.ts`, `overtime.service.ts`, `hr-time-workflow-side-effects.spec.ts` | four empty catches made observable; overtime moved onto after-commit |

Each verified with `git show --stat HEAD`; file counts were 3, 2 and 3 respectively, all mine.
