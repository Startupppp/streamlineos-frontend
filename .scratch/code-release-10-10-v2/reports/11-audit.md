# 11 — Accounting and Finance (PRD-C126) — head audit

Second-pass audit. The prior report (`11-accounting-finance.md`) was read in full first; its claims
were re-verified at head, three of its severities are **corrected downward** with evidence, and the
bulk of this report is territory it did not enter.

| | |
|---|---|
| Backend commit | `2f37e1bb035006e5c03680497298ad62031e79d6` (`release/code-10-10-v2`) — **17 commits ahead** of the prior audit's `959b0a8` |
| Frontend commit | `7469d27895add587f9427e7c50c457f56e0048bf` (`release/code-10-10-v2`) — **8 commits ahead** of the prior audit's `778f7d4` |
| Databases used | `scratch_head_1010` (owner + non-owner roles), journal **677/677**. The prior audit measured `scratch_perf_seed` at **665/665 — 12 migrations behind head**; every DB claim below is re-taken at head. |
| Writes | **none.** No file in either repo was edited. No `scratch_*` database was modified. |

---

## 1. What I read, with numbers

### Backend corpus

| Module | Files | of which spec | Controllers | Services | `@Module`s | Route decorators |
|---|---|---|---|---|---|---|
| `src/modules/accounting/**` | 88 | 26 | 14 | 23 | 6 | 67 |
| `src/modules/finance/**` | 232 | 98 | 40 | 55 | 10 | 147 |
| `src/modules/invoices/**` | 23 | 9 | 2 | 5 | 1 | 10 |
| `src/modules/expenses/**` | 30 | 8 | 5 | 7 | 1 | 25 |
| `src/modules/quotes/**` | 8 | 2 | 1 | 2 | 1 | 11 |
| **Total** | **381** | **143** | **62** | **92** | **19** | **260** |

Tables: **46** declared in `src/db/schema/accounting/` (10 files), plus **8** in `src/db/schema/crm/invoicing.ts`
(`invoices`, `invoice_items`, `payments`, `purchase_bills`, `purchase_bill_items`, `vendor_payments`,
`quotes`, `quote_line_items`) and `expenses` in `src/db/schema/payroll/claims-and-settlements.ts` —
**55 tables in scope**. Plus **13 code-less `gl_*` tables** that exist only in the catalog.

Analyses actually run over that corpus (scripts in the scratchpad, not the repo):
- **124 join ON-clauses** parsed and classified for a tenant term.
- **50 `db.transaction(async …)` blocks** parsed by brace balance and scanned for provider calls inside.
- **263 float-money candidate sites** enumerated and grouped by file.
- **30 cache call sites** checked for an org dimension in the key.
- **800,000 randomized numeric trials** in node against two suspected float-money paths.

### Frontend corpus

- `features/accounting/**`: **180 files**, **161 `.tsx`**, across **19 sub-directories**.
- `hooks/api/accounting/**`: **32 files**, **227 `queryKey:` sites**, **124 mutation hooks**.
- `app/(authenticated)/accounting/**`: **74 `page.tsx` routes**.
- `types/accounting/`: 6 files.
- **121 of 161 `.tsx`** read a query result; each was classified for loading/error branches.

### Gates executed at head

Backend, all **exit 0**: `check:unbounded-reads`, `check:n1-growing-loops`, `check:conflict-targets`,
`check:bulk-id-limits`, `check:idempotent-commands`, `check:outbox-consumers`, `check:retention-coverage`,
`check:transaction-callbacks`, `check:tenant-isolation`, `check:scope-application`,
`check:declaration-column-drift` (against `scratch_head_1010`).

Frontend, all **exit 0** (must be run from `frontend/`, not the repo root — from the root all seven
exit 1 on a missing script, which is a harness trap, not a violation): `check:query-scope`,
`check:gated-reads`, `check:permission-binding`, `check:permission-catalog`, `check:response-contracts`,
`check:empty-states`, `check:formatters`.

**Two of those green gates are demonstrably vacuous over this ticket's surface — §5.**

---

## 2. Per-criterion assessment — PRD-C126

The criterion names ten dimensions. Each is walked in order.

### 2.1 Immutable, tenant-safe ledgers — **MET**

Re-taken from `pg_trigger`/`pg_proc` on `scratch_head_1010` (677/677, not the prior audit's 665):

```
invoices        :: trg_invoice_immutability        :: enforce_invoice_immutability
journal_entries :: trg_journal_entry_immutability  :: enforce_journal_entry_immutability
journal_lines   :: trg_journal_line_immutability   :: enforce_journal_line_immutability
```

`uniq_je_idempotency ON journal_entries (org_id, source_type, source_id, source_event)` exists live and
is the ledger's replay key — this matters for finding **F3** below.

RLS re-checked at head across the 18 tables the reports join: **all 17 tenant tables have
`relrowsecurity = t` with exactly one policy**; `users` is the only one without, and it is a global
identity table. `check:tenant-isolation` exit 0 (static — it proves a test exists, not that it passes;
`check:tenant-isolation:run` was **NOT RUN**, mutex budget).

**Tenant predicates on joins — measured, and the honest answer is "RLS, not the predicate."**
Of **124 join ON-clauses** in scope, **3 carry an `orgId` term and 121 do not**. Every one of the 121
joins a table with RLS enabled, so a cross-tenant row cannot be reached. This is a defence-in-depth
gap against CLAUDE.md §3 (predicate should be explicit), **not a leak**. I did not find a single join
where the absence produces a wrong row. Reported, not counted as a finding.

`gl_*` re-verified at head: **13 tables still in the catalog, `grep -rn "gl_" src/ --include="*.ts"`
returns 0 hits, `src/db/schema/accounting/gl-kernel.ts` does not exist.** The prior audit's central
conclusion — the live kernel is `ledger_accounts`/`journal_entries`/`journal_lines`, and the `gl_*`
tables are codeless residue — **holds unchanged at head.**

### 2.2 Normalized expenses and reconciliation — **MET**

`expenses` is a real relational table with `org_id`, `status`, `deleted_at` and indexes — no JSONB
line arrays. The prior audit's expense-import fix (`parseImportAmount`) is **landed at head**
(commit `591cf6639`), with `src/modules/expenses/expenses-import-amount.spec.ts` present.
The banking reconciliation money fixes are landed (`bank-accounts`, `reconciliation`, `transfers`,
`ap-approval.helper`). Verified by `git diff --stat 959b0a8..HEAD`.

### 2.3 Bounded, indexed reads — **PARTIALLY MET**

`check:unbounded-reads` exit 0 with **3 actionable repo-wide, 0 in scope**. But the gate's ratchet is
not the whole answer:

- **7 N+1 growing-loop sites in scope** that the prior audit reported only as an aggregate ("97 vs
  ratchet 102") and never enumerated. They are:
  `accounting/gl/recurring-journals.service.ts:287`, `finance/ap/bills-due-check.service.ts:54`,
  `finance/ap/payment-run-executor.service.ts:93` (**a full `db.transaction` per row**),
  `finance/tax/tax-compliance.service.ts:66`, `invoices/invoices-lifecycle.service.ts:148`,
  `invoices/invoices-payment.service.ts:175`, `invoices/invoices-write.service.ts:294`.
- The **frontend** ceiling is the real defect here — finding **F6**. Eight account-selector surfaces
  cap at the endpoint's maximum page size and discard the cursor.

`bills-due-check.service.ts:34-36` makes the org predicate conditional (`if (orgId)`). The only caller,
`cron-finance.service.ts:99`, is inside `forEachOrg` and always supplies one, so the cross-tenant sweep
is **not reachable**. Reported for the record, not as a finding.

### 2.4 Queue-backed exports and reminders — **MET**

`check:outbox-consumers` exit 0: 24 emitted / 29 declared / **29 registered**. The in-scope events
(`expense.export.requested`, `finance.report.export.requested`, `accounting.bill.approved`,
`accounting.bill.paid`, `accounting.invoice.reminder.due`) all have a registered consumer reachable
from `AppModule`.

One thing worth recording so nobody re-chases it: the gate's "emitted" list is derived by scanning for
**string literals**, so events emitted through a constant do not appear. `accounting.invoice.reminder.due`
looks un-emitted in the gate output but **is** emitted at `finance/ar/reminders.service.ts:285` via
`INVOICE_REMINDER_EVENT`. Not a defect — a gate-detection artifact.

### 2.5 Idempotent consumers — **MET at the transport, BROKEN at one producer**

`check:idempotent-commands` exit 0 — every in-scope mutating handler carries `@Idempotent`; the two
`finance/controls/approvals.controller.ts` skips are declared `bespoke-mechanism`.
`check:conflict-targets` exit 0 — 362 `onConflict` calls, 159 with an explicit target, **0 uninferable
arbiters**.

But the *ledger's own* idempotency key is misused by one producer: **finding F3**. That is a producer
bug, not a transport bug, which is why the consumer gate cannot see it.

### 2.6 Retention — **MET**

`check:retention-coverage` exit 0; `accounting/posting/financial-retention.spec.ts` present.

### 2.7 Authorization — **PARTIALLY MET**

`check:permission-binding` exit 0 over **2384 bindings**; `check:permission-catalog` exit 0 with Rule 3
(byte-identical regeneration from the backend) actually running. `check:scope-application` exit 0.

Both gates miss the same class of defect: **5 `accounting:*` permissions are catalogued and grantable
but bound to no route** in `contracts/openapi.json` — `accounting:access:manage`, `accounting:access:view`,
`accounting:journal:post`, `accounting:receivables:approve`, `accounting:receivables:manage`. Two of
them gate live UI controls against a permission the server never checks — **finding F7**.

### 2.8 Transaction discipline / provider-in-transaction — **MET**

Measured, not assumed: **50 `db.transaction(async …)` blocks** in scope were parsed by brace balance
and scanned for provider-shaped calls. **3 hits, all `this.dispatch.emit(…)`** —
`accounting/core/accounting-journal-entry.service.ts:138`,
`accounting/posting/finance-posting.service.ts:266`, `finance/ap/payment-run-executor.service.ts:204`.

`NotificationDispatchService.emit` (`notification-dispatch.service.ts:71-83`) writes to
`notification_outbox` on the **ambient** transaction when one exists — a transactional outbox, the
correct pattern. `this.db` is an AsyncLocalStorage-backed proxy that routes to `context.tx`
(`common/tenant/tenant-context.ts:23-31`), so the emit lands in the same transaction as the journal.
The `emitNow` fallback deliberately escapes via `runOutsidePoolBorrow` + `runOutsideTenantContext`.
**Zero provider calls held inside a database transaction in this corpus.** A genuine strength.

### 2.9 Money in floating point — **NOT MET**

`money.util.ts` is exact (bigint at scale 4, half-up rounding, largest-remainder allocation) and is
imported by 28 files. The prior audit fixed 6 sites. **263 float-money candidate sites remain in
scope**, concentrated in `expenses.service.ts` (23), `tax-dashboard.service.ts` (16),
`finance-report-export-worker.service.ts` (15), `tax-reports.service.ts` (14),
`accounting-payables.service.ts` (11), `credit-notes.service.ts` (10), `invoices-update.service.ts` (9),
`vendor-credits.service.ts` (9).

I did **not** treat that count as 263 findings. I traced the subset where the float value is
**persisted, posted to the immutable ledger, or used to authorize**, and confirmed each by running the
arithmetic. Findings **F1, F2, F4, F5, F8, F10, F11, F13, F14** come out of that trace.

I also cleared two suspects honestly:
- `provider-bridge.service.ts:33` (`net = gross - fee` on doubles) — **800,000 randomized (gross, fee)
  pairs** at 2dp/1e8 and 4dp/1e8 magnitudes produced **0 unbalanced journals**. Reported as P3 hygiene,
  not as a correctness defect, because I could not find a failing input.
- `decimalFromNumber` — correct. It pins a JSON double to scale 4 exactly once, and I verified by
  300,000 trials that the function is idempotent on its own images.

### 2.10 Frontend states and production-shaped workflow tests — **PARTIALLY MET**

Reports are the strong half: **all 19 report pages that read a query carry an error branch** (verified
file by file). Mutation invalidation is near-complete: of **124 mutation hooks**, the only ones without
a cache write are 4 AI/suggestion calls that write no server state.

The weak half: **27 of 121** query-reading accounting components render data with a loading branch and
**no error branch** — finding **F9**.

**Production-shaped workflow tests: NOT MEASURED.** A seeded end-to-end run of the accounting golden
paths would measure it; `check:tenant-isolation:run` and `next build` were both out of the laptop
budget, and no jest sweep was run for this audit.

---

## 3. Findings

| # | Sev | File:line | Failure scenario | Proposed fix |
|---|---|---|---|---|
| **F1** | **P0** | `backend/src/modules/finance/controls/provider-bridge.service.ts:65-71` | `postJournal` is called with `currency: input.currency` and **no `exchangeRate`**. `finance-posting.service.ts:132-134` throws `BadRequestException` whenever `currency !== baseCurrency` and no rate is given. A Stripe/Razorpay webhook for a USD payment against an INR-base org therefore **never posts to the ledger**; `payment-webhook-receiver.service.ts:313` catches it, logs, marks the row failed and returns **200** to the provider — and its own comment states the event is already recorded so a retry "would short-circuit as a duplicate and never re-run the bridge". Money received, no journal entry, no recovery path. | Resolve the rate in the bridge via `RateResolverService.getRate(orgId, input.currency, baseCurrency, input.occurredAt)` and pass `exchangeRate`; on an unresolvable rate, park the payment in a review queue rather than dropping it. Make the receiver's failure path re-drivable (a `bridge_status` column on the webhook row that a sweep retries) instead of terminal. |
| **F2** | **P1** | `backend/src/modules/accounting/posting/finance-posting.service.ts:217-218` (write) vs `accounting/core/accounting-statements.service.ts:89,156,214`, `accounting-cash-flow.service.ts:100`, `gl/general-ledger.service.ts:46,80,124,226`, `finance/planning/bva.service.ts:101`, `finance/tax/tax-dashboard.service.ts:230` (read) | For a foreign-currency entry, `journal_lines.debit/credit` hold the **foreign** amount and `base_debit/base_credit` hold the converted amount. **`base_debit`/`base_credit` are read by nothing** — `grep` for them across `src/` returns only the 6 write-side lines in `finance-posting.service.ts`. Every trial balance, balance sheet, P&L, cash-flow, GL-balance and tax-dashboard aggregation sums the raw `debit`/`credit`. A USD 1,000 bill at rate 83.5 contributes **₹1,000** to the trial balance instead of ₹83,500. The statements are wrong the moment one foreign entry exists. | Have every base-currency aggregation sum `COALESCE(base_debit, debit)` / `COALESCE(base_credit, credit)`. Add a spec that posts one foreign entry and asserts the trial balance equals the base amount. |
| **F3** | **P1** | `backend/src/modules/finance/controls/fx.service.ts:33,52` | Both branches hardcode `sourceType: "fx_settlement"`, **discarding the caller's `input.sourceType`** (used only in the description string). The replay key is therefore `(orgId, "fx_settlement", sourceId, "realized_gain_loss")`, enforced both by `finance-posting.service.ts:139-153` and by the live unique index `uniq_je_idempotency`. Two consequences: (a) an invoice settled in three instalments at three rates records only the **first** realized FX gain/loss — the 2nd and 3rd return `{replayed:true}` with no error and no log, understating FX P&L; (b) invoice **#42** and purchase bill **#42** in the same org collide — the three callers pass `String(invoice.id)` (`invoices-payment.service.ts:284`), `String(bill.id)` (`accounting-payables.service.ts:446`) and `String(capture.billId)` (`payment-run-executor.service.ts:271`) into one slot. | Pass `sourceType: input.sourceType` through, and make `sourceEvent` unique per settlement (e.g. `realized_gain_loss:${paymentId}` or a settlement sequence) so each instalment posts its own entry. |
| **F4** | **P1** | `backend/src/modules/invoices/invoices-update.service.ts:132,138,141,122` | Editing a **draft** invoice's line items deletes every `invoice_items` row and re-inserts them with `hsnSacCode: null` and `gstRate: "0.00"` hardcoded, then recomputes tax as `subtotal * (taxRate/100)` at a single blended rate. The create path (`invoices-write.service.ts:62-66`) stores real per-line `gstRate`. So an invoice built with HSN 9983 @ 18% and HSN 9954 @ 5% loses both HSN codes and both rates on the first edit — the statutory content of an Indian GST tax invoice, and the source of the GSTR-1 HSN summary. The update DTO has no `items` branch at all (`dto/invoice-write.schemas.ts:37-38` declares both shapes; the service handles only `lineItems`). **Reachable via `PATCH /invoices/{invoiceId}` (declared in `contracts/openapi.json`, permission `accounting:update`); NOT reachable from the shipped UI** — `features/billing/invoices-client.tsx:160`, the only `useUpdateInvoice` caller, sends `{id, status}` only. | Give the update path an `items` branch mirroring `invoices-write`; preserve `gstRate`/`hsnSacCode` per line; recompute tax per line, not from a blended `taxRate`. Until then, reject a `lineItems` PATCH on an invoice whose stored lines carry a non-zero `gst_rate`. |
| **F5** | **P1** | `backend/src/modules/accounting/posting/finance-posting.service.ts:160-183` | `entryTotal` sums the raw **foreign-currency** line debits and is compared against `finApprovalPolicies.minAmount`, which is denominated in the org's base currency. A USD 1,000 journal (₹83,500 at 83.5) evaluates `1000 >= 50000` → false, so a policy requiring approval above ₹50,000 is **silently bypassed** and the entry posts directly (`initialStatus = "POSTED"`, line 185). Separation of duties defeated by choosing a currency. | Compute `entryTotal` from the base amounts (`multiplyDecimals(debit, exchangeRate)`) before the policy comparison, or reject foreign-currency manual journals from the direct-post path. |
| **F6** | **P1** | `frontend/features/accounting/core/opening-balances-editor.tsx:53`, `core/new-journal-entry-page.tsx:192`, `core/recurring-journal-sheet.tsx:122`, `banking/components/add-bank-account-sheet.tsx:58`, `banking/components/reconciliation-match-panel.tsx:61`, `assets/category-dialog.tsx:63`, `settings/fin-settings-dialogs.tsx:166`, `coa/account-detail-page.tsx:174` | All eight call `useAccounts({ limit: 100 })`. The backend caps that endpoint at exactly 100 (`accounting.schemas.ts:13` → `pageSizeField(20, 100)`), the response is a `CursorResponse` carrying `pageInfo.hasMore`/`nextCursor`, and `useAccounts` (`hooks/api/accounting.ts:74`) is a plain `useGatedQuery` that **discards both** and passes no `q` search term. Verified: `grep -c 'nextCursor|hasMore|fetchNextPage|q:'` returns **0** in seven of the eight files. An org whose chart of accounts exceeds 100 accounts — routine; the seeded chart is 49, but real charts run to several hundred — **cannot select accounts 101+ in a journal entry, an opening-balance line, a recurring journal, a bank-account GL mapping, an asset-category mapping or the finance settings dialogs**, and the UI gives no sign the list was truncated. `pageSizeField` clamps rather than rejects (`list-query.schema.ts:27`), so the three call sites asking for `limit: 200` are silently served 100 with no error. | Convert these to a searchable/async combobox that passes `q` to the endpoint, or to `useInfiniteQuery` following `nextCursor`. At minimum render `pageInfo.hasMore` as a visible "showing first 100 — search to narrow" affordance. |
| **F7** | **P1** | `frontend/features/accounting/core/journal-entry-detail-page.tsx:46` (gates lines 124, 142); `frontend/features/accounting/invoices/invoices-page.tsx:98` (gates line 128) | Both gate on a permission **no backend route declares**. `useCan("accounting:journal:post")` guards Post and Reverse, but `POST /accounting/journal/{entryId}/post` and `/reverse` declare **`accounting:journal:manage`**. `useCan("accounting:receivables:manage")` guards the invoice create control, but `POST /invoices` declares **`accounting:create`**. A user granted the permission that actually authorizes the operation sees the control **hidden** — the feature is invisible to exactly the role that owns it. A user granted the UI key alone sees the control and gets a 403. `check:permission-binding` passes over 2384 bindings because a permission bound to no route is unresolvable, so it is never compared. | Re-key both gates to the permission the route declares. Add a rule to `check-permission-route-binding.mjs` that fails when a `useCan` key is absent from every `x-permission` in `contracts/openapi.json` (5 `accounting:*` keys are currently in that state). |
| **F8** | **P1** | `backend/src/modules/finance/ap/payment-run-executor.service.ts:110` vs `:126` | Inside one transaction the same payment is written twice at two scales: `vendorPayments.amount` gets `Number(item.amount).toFixed(2)` and `finVendorPaymentAllocations.amount` gets the raw `item.amount`. Confirmed against the live catalog on `scratch_head_1010`: `vendor_payments.amount numeric(12,2)`, `fin_vendor_payment_allocations.amount numeric(18,4)`, `fin_payment_run_items.amount numeric(18,4)`, `purchase_bills.amount_paid numeric(18,4)`, `journal_lines.debit numeric(18,4)`. A run item of ₹100.0050 records a payment of ₹100.00 and an allocation of ₹100.0050 — the payment register and the AP subledger disagree by up to ₹0.005 per item, permanently and silently. `payments.amount` has the same `numeric(12,2)` shape and the same divergence at `invoices-payment.service.ts:57` vs `:171`. Separately, `decimal(12,2)` caps at ₹9,999,999,999.99 while the source column caps at ₹99,999,999,999,999.9999, so an item above ₹10bn raises `22003` mid-run and — because the executor opens **one transaction per item** (line 93) — earlier items stay committed and the run is half-executed. | Widen `vendor_payments.amount` and `payments.amount` to `numeric(18,4)` in a migration and write the raw decimal string at both sites. Batch the executor's per-item transactions, or make partial completion explicit and resumable. |
| **F9** | **P1** | `frontend/features/accounting/purchases/vendor-payment-allocation-dialog.tsx:72` (+26 more, listed in §4) | `const bills = billsQuery.data?.data ?? []` with **no `isError` anywhere in the file**. On a 500 the bill selector renders empty and the user reads it as "this vendor has no posted bills to allocate against" — a failed load presented as a settled financial fact. This is the exact shape the prior audit fixed in `reconciliation-client.tsx`, unfixed in 27 sibling components. The same file also caps the allocation target list at `usePurchaseBills({ status: "POSTED", limit: 50 })` with no pagination and no search, so a vendor with >50 posted bills cannot have a payment allocated to bill #51+. | Add an `ErrorState` branch ahead of the content in each, with `getErrorMessage` and a retry that refetches. Prioritise the 8 money-bearing surfaces named in §4. |
| **F10** | **P2** | `frontend/features/accounting/purchases/bill-form-schemas.ts:78-92` vs `backend/src/modules/accounting/core/accounting-payables.service.ts:90-113` | The client computes totals in doubles at scale 2; the backend computes them exactly at scale 4. Verified by running both: for a tax pool of **9.01** the client shows CGST **4.51** / SGST **4.50** where the backend stores **4.5050 / 4.5050**; for **0.05** the client shows **0.03 / 0.02** vs **0.025 / 0.025**; for **18.045**, **9.02 / 9.03** vs **9.0225 / 9.0225**. The totals panel the user approves disagrees with the bill that is saved. | Port `money.util`'s `roundDecimal`/`allocateDecimal`/`multiplyDecimals` to the client (or expose a preview endpoint) so one implementation produces both numbers. This is one coherent unit with the invoice-total work the prior audit deliberately left open. |
| **F11** | **P2** | `backend/src/modules/accounting/core/accounting-journal-entry.service.ts:205-206` | Reversal reads scale-4 decimal strings from the ledger and converts them back through `Number(toDecimal(...))` before re-pinning. Measured: the round-trip is **exact below ₹900,719,925,474.0992** (2⁵³/10⁴) and **lossy above it** — 96% of random 4-dp values in the `decimal(18,4)` range are corrupted (`92750470145163.6827 → 92750470145163.6875`). Lines written by `finance-posting.service.ts:211` (`formatDecimal`, exact strings, never through a double) at that magnitude can produce a reversal whose debits and credits differ by 0.0001, so `assertDebitsEqualsCredits` throws and **a posted entry becomes permanently unreversible** — with immutability, there is no other correction path. High threshold, but `decimal(18,4)` explicitly permits it and `accounting.schemas.ts:61-62` puts **no `.max()` on `debit`/`credit`** (contrast `:174`, which caps a payment at 999999999.99). | Keep the reversal in decimal strings — build `DraftLine` from `line.credit`/`line.debit` directly rather than through `Number`. Add a `.max()` to the journal line schema consistent with the column. |
| **F12** | **P2** | `backend/src/modules/billing/payments/payment-webhook-receiver.service.ts:296,299` | `String(paymentEntity.amount / 100)` hardcodes a 1/100 minor unit. There is **no zero-decimal or three-decimal currency handling anywhere in the backend** (`grep` for `JPY|zeroDecimal|minorUnit|currencyExponent` finds only a locale map and a words-in-numbers table), while `organization.schemas.ts:47` offers **JPY** as an org currency. Stripe sends JPY in whole yen and KWD in thousandths. For a JPY-base org (where `isForeign` is false, so F1 does not mask it) a ¥10,000 payment posts as **¥100**. | Introduce a currency-exponent table and divide by `10^exponent`. Cross-territory with ticket 10. |
| **F13** | **P2** | `backend/src/modules/invoices/invoices-payment.service.ts:289`; `accounting/core/accounting-payables.service.ts:451`; `finance/ap/payment-run-executor.service.ts:276` | All three wrap `postRealizedGainLoss` in a `catch` that logs at **warn** and continues, with a message that names only the "no exchange rate" case. Any other failure — a closed period, an unseeded FX account, F3's replay swallow, F1's missing-rate throw — silently produces an invoice/bill that is fully paid with **no realized FX gain or loss recorded**. The P&L is understated and nothing surfaces it. | Narrow the catch to the specific rate-not-found error and let everything else propagate, or record the failure on a durable queue the finance surface can show. |
| **F14** | **P2** | `backend/src/modules/invoices/invoices-payment.service.ts:87,92,147,152` | The overpayment guard sums money as `COALESCE(sum(payments.amount::numeric),0)::float` — **an explicit double cast on money inside SQL** — and then compares `input.amount > remaining + 0.01`, a deliberate 1-paisa slack. Every invoice can be systematically overpaid by up to ₹0.01, and the guard's own arithmetic is inexact. The same shape is repeated in the locked re-check at 147-152, so the concurrency guard inherits it. | Sum as `numeric`, return it as text, and compare with `compareDecimals`. If a tolerance is genuinely wanted, name it as a decimal constant the way the prior audit's `RECONCILIATION_TOLERANCE` does. |
| **F15** | **P2** | `frontend/features/accounting/banking/components/banking-hub-client.tsx:125-128` | `accounts.reduce((sum, a) => sum + parseFloat(a.currentBalance), 0)` renders "Total Cash Balance". `fin_bank_accounts.currency` (`db/schema/accounting/finance-banking.ts:23`) is a free-text column defaulting to INR, so a USD and an INR account are added as bare numbers. The sum also covers one cursor page only, with no pagination control. | Group by currency and render one figure per currency, or convert through `fin_exchange_rates` before summing. Show the page bound. |
| **F16** | **P2** | `frontend/features/accounting/purchases/vendor-credits-page.tsx`, `recurring-bills-page.tsx`, `sales/recurring-invoices-page.tsx`, `core/recurring-journals-tab.tsx`, `banking/components/bank-import-client.tsx`, `planning/forecast-page.tsx`, `core/opening-balances-editor.tsx` | These seven pages contain **zero** `useCan` / `useAccess` / `RequireModule` references, so mutating controls render unconditionally for every viewer. **Corrected severity — see §5:** every one of their mutation hooks routes through `useAuthorizedMutation`, which genuinely refuses (`hooks/api/authorized-mutation.ts:48-51` throws before calling `mutationFn`). The gate is real; the defect is that an unpermitted user sees an enabled button and gets a raw `Missing permission: accounting:recurring:manage` toast on click. | Hide or disable the control with the same key the hook already carries, so the affordance matches the authorization. |
| **F17** | **P3** | `backend/src/modules/finance/controls/provider-bridge.service.ts:31-36` | `gross`/`fee`/`net` are computed as IEEE-754 doubles and rendered with `toFixed(4)` into the journal. **I could not find a failing input**: 800,000 randomized `(gross, fee)` pairs at 2dp/1e8 and 4dp/1e8 magnitudes produced **0 unbalanced journals**. Reported as hygiene — the surrounding module was converted to exact arithmetic and this path was missed — not as a demonstrated correctness defect. | Route through `subtractDecimals(toDecimal(grossAmount), toDecimal(feeAmount))` for consistency with the rest of `finance/`. |

---

## 4. The 27 components with no error branch (F9)

Measured over the **121 of 161** `features/accounting/**/*.tsx` that read a query result. Criterion:
renders query data, has a loading/skeleton branch, and contains **no** `isError` / `ErrorState` /
`status === "error"` anywhere in the file.

**Money-bearing (fix first):** `purchases/vendor-payment-allocation-dialog.tsx`,
`purchases/vendor-credit-apply-dialog.tsx`, `purchases/vendor-credit-form-sheet.tsx`,
`purchases/bill-detail-view.tsx`, `expenses/pay-batch-dialog.tsx`, `expenses/expense-table.tsx`,
`expenses/reimbursement-table.tsx`, `sales/invoice-detail-panels.tsx`.

**Selector/config surfaces:** `settings/fin-settings-sections.tsx`, `settings/setup-wizard-steps.tsx`,
`settings/payment-terms-section.tsx`, `settings/fin-settings-dialogs.tsx`,
`purchases/recurring-bill-form-sheet.tsx`, `core/apply-template-dialog.tsx`,
`core/dimension-values-sheet.tsx`, `core/recurring-journal-sheet.tsx`,
`sales/apply-credit-note-dialog.tsx`, `sales/recurring-template-form-sheet.tsx`,
`sales/credit-note-form-sheet.tsx`, `expenses/create-batch-sheet.tsx`, `planning/revisions-sheet.tsx`,
`banking/components/bank-import-client.tsx`, `banking/components/add-bank-account-sheet.tsx`,
`banking/components/reconciliation-match-panel.tsx`, `banking/components/reconciliation-rules-sheet.tsx`,
`assets/asset-table.tsx`, `assets/category-dialog.tsx`.

`check:empty-states` returns exit 0 over all 27 — it only detects hand-rolled layouts matching a
single-line class signature plus a noun allowlist (`scripts/check-no-handrolled-empty-states.mjs:31-37`),
and a missing branch is not a hand-rolled one.

---

## 5. Corrections to the prior audit

Three of the prior report's findings do not survive verification at head. Recording them so the fix
wave does not spend effort on them.

1. **"Six ungated mutating controls, P1" → P2, and the gate is not inert.**
   The prior audit checked the *page* files for `useCan` and stopped there. Every one of the seven
   mutation hooks those pages use is a `useAuthorizedMutation` carrying exactly the permission key the
   prior audit named — verified individually: `usePostVendorCredit` → `accounting:vendor-credits:manage`
   (`ap-vendors.ts:191`), `useDeleteRecurringBill` / `useRunRecurringBillNow` → `accounting:recurring:manage`
   (`ap-vendors.ts:268,283`), `useDeleteRecurringJournal` / `useRunRecurringJournalNow` →
   `accounting:recurring:manage` (`core-recurring.ts:94,106`), `useCreateBankImport` →
   `accounting:banking:import` (`banking.ts:230`), `usePostOpeningBalances` → `accounting:journal:create`
   (`core-periods.ts:150`). `useAuthorizedMutation` resolves the access snapshot and **throws before
   invoking `mutationFn`** (`authorized-mutation.ts:43-51`). These are UX defects, not authorization
   defects — recorded as **F16**.

2. **"`accounting:access:view` is permanently denied to everyone but the org owner, P1" → not true.**
   `accounting` **is** in `delegableModuleIds` (14 modules, verified in
   `contracts/permission-catalog.json`), so an org owner can grant the key to a role and the page becomes
   reachable. The key is in the vendored catalog's 704 permissions and Rule 3 confirms the catalog is a
   byte-identical regeneration from the backend. The real defect in this area is different and is
   recorded as **F7**: it is **route-unbound**, along with 4 other `accounting:*` keys.

3. **"`invoice_items` declared-vs-live drift, P2" → registered, not drift.**
   Re-verified at head: the declaration (`db/schema/crm/invoicing.ts:63-75`) still omits `org_id`, and
   the live column still exists (`id, invoice_id, description, hsn_sac_code, quantity, rate, gst_rate,
   amount, line_order, org_id`) with `trg_set_org_id → set_org_id_from_parent`. But
   `check:declaration-column-drift` against `scratch_head_1010` exits **0** and prints
   `public.invoice_items.org_id — supplied by BEFORE INSERT trigger trg_set_org_id — undeclared on
   purpose`, alongside 18 sibling `*_lines` tables. This is a registered design decision. The residual
   consequence the prior audit named is real and unchanged — no application code can express a tenant
   predicate on `invoiceItems.orgId`, which is why `invoices-update.service.ts:132` deletes by
   `invoiceId` alone — but it is not drift and does not belong to a migration wave.

The prior audit's other claims **were re-verified and hold at head**: the `gl_*` inversion (§1 of that
report), the immutability triggers, the money fixes landing in `591cf6639`, the invoice-total arithmetic
still open (`invoices-write.service.ts:63-75`, `invoices-update.service.ts:117-123`), the banking
wire-shape drift (`hooks/api/accounting/banking.ts:38,39,52` declare `matchType`, `matchedRecordId`,
`confirmedBy` where the columns are `matchedJournalEntryId` and `confirmedByMembershipId`,
`finance-banking.ts:70,86,87,91`), and the client GST divergence (now quantified as **F10**).

---

## 6. What head already gets right

Not inferred — each was measured for this report.

- **Immutability is real and two-layered.** Database triggers on `invoices`, `journal_entries`,
  `journal_lines` at head, plus `assertEntryNotPosted` in the application, plus **zero**
  `update(journalLines)` / `delete(journalLines)` production call sites.
- **Zero provider calls inside a database transaction** across **50** transaction blocks — the three
  in-transaction calls are outbox writes on the ambient transaction, which is the correct pattern.
- **Zero uninferable `ON CONFLICT` arbiters** across **362** upsert calls repo-wide.
- **Every in-scope mutating handler carries `@Idempotent`**; the two exceptions are declared.
- **RLS is enabled with a policy on all 17 tenant tables** the accounting reads join, which is what
  actually closes the 121 joins that carry no explicit org predicate.
- **`money.util.ts` is a correct exact-decimal kernel** — bigint at scale 4, half-up rounding,
  largest-remainder allocation, `assertDebitsEqualsCredits` — imported by 28 files, and
  `decimalFromNumber` is verifiably idempotent on its own images.
- **All 19 report pages carry an error branch.** The reports are the best-defended surface in the module.
- **Mutation invalidation is near-complete**: 124 mutation hooks, 4 non-invalidating and all of them
  AI/suggestion calls that write no server state.
- **Query-cache tenancy is closed by the switch path.** `queryKeyBase` is `["streamlineos"]` with **no
  org dimension in any of the 227 accounting query keys** — but `useSwitchOrg` calls
  `queryClient.clear()` on success (`hooks/common/auth-hooks.ts:170`), so no stale tenant read
  survives a switch. A defence-in-depth gap, not a leak; recorded here rather than as a finding.
- **Queue-backed exports and reminders are wired end to end** — 29 declared event types, 29 registered
  consumers, all reachable from `AppModule`.

---

## 7. Blocked on infrastructure / not measured

- **Production-shaped workflow (E2E) tests — NOT MEASURED.** What would measure it: the seeded
  accounting golden paths against a local Postgres with `APP_DATABASE_URL` on a non-owner role, run as
  a targeted `jest --runInBand` over `src/modules/{accounting,finance,invoices}/**/*.e2e-spec.ts`.
  Out of the laptop budget with 26 concurrent agents.
- **`check:tenant-isolation:run` — NOT RUN.** The static half is exit 0 over 931 services; the
  execution companion is a full jest sweep.
- **`next build` / `typecheck` — NOT RUN**, per the brief. The orchestrator owns these.
- **F2 not reproduced against data.** `journal_lines` in `scratch_head_1010` has no foreign-currency
  rows (the DB is migration-bootstrapped, not seeded). The finding rests on reading the write site,
  the 20+ read sites, and a repo-wide `grep` proving `base_debit`/`base_credit` have zero consumers —
  which is sufficient, but a seeded foreign-currency journal plus a trial-balance assertion would
  close it decisively.
- **F1 not reproduced end to end.** It would need a webhook fixture with a non-INR `currency` driven
  through `PaymentWebhookReceiverService` against a live DB. The chain is proven by reading:
  `provider-bridge.service.ts:65-71` (no `exchangeRate`) → `finance-posting.service.ts:132-134`
  (throws) → `payment-webhook-receiver.service.ts:313` (swallows, returns 200, comment confirms no retry).
- **F6's real-world trigger not measured.** The seeded chart of accounts is 49 accounts
  (`coa-templates.constants.ts`, `IN_STANDARD_ACCOUNTS`), below the 100 ceiling. The claim that real
  charts exceed 100 is domain judgement, not a measurement. The ceiling itself and the discarded
  cursor are measured facts.
- **`check:alert-ack`** still cannot run (needs a real `ALERT_WEBHOOK_URL` and a human ack) — outside
  this ticket.

---

## 8. Classification of the corpus

| Path | Files (src / spec) | Verdict | Reason |
|---|---|---|---|
| `src/modules/accounting/**` | 62 / 26 | **KEEP** (3 **REFACTOR**) | Live GL kernel, 6 modules, 67 routes. `posting/finance-posting.service.ts` (F2, F5), `core/accounting-journal-entry.service.ts` (F11), `core/accounting-payables.service.ts` (F13). |
| `src/modules/finance/**` | 134 / 98 | **KEEP** (3 **REFACTOR**) | 10 modules, 147 routes, all reachable. `controls/fx.service.ts` (F3), `controls/provider-bridge.service.ts` (F1, F17), `ap/payment-run-executor.service.ts` (F8, F13). |
| `src/modules/invoices/**` | 14 / 9 | **KEEP** (2 **REFACTOR**) | `invoices-update.service.ts` (F4 — destroys statutory line data), `invoices-payment.service.ts` (F13, F14). |
| `src/modules/expenses/**` | 22 / 8 | **KEEP** | Normalized, `money.util`-backed, import path fixed at head. |
| `src/modules/quotes/**` | 6 / 2 | **KEEP** | Reachable; no defect found. |
| `finance/reports/finance-reports-csv.util.ts` | 1 / 1 | **REMOVE candidate — still not removed** | Re-verified at head: its only importer is its own spec. Its live twin (`finance-report-export-worker.service.ts:28`) lacks its `CSV_ROW_CAP`, so adopting it is a behaviour change, not a refactor. Unchanged from the prior audit. |
| 13 `gl_*` tables (catalog only) | 0 / 0 | **REPORT** | Re-verified at head: present in `scratch_head_1010`, zero `gl_` references in `src/**/*.ts`, no schema declaration, no immutability trigger. A release-owner decision, not a code change. |
| `frontend/features/accounting/**` | 161 `.tsx` | **KEEP** (27 + 8 + 2 **REFACTOR**) | 27 missing error branches (F9), 8 account selectors with an invisible ceiling (F6), 2 mis-keyed permission gates (F7). |
| `frontend/hooks/api/accounting/**` | 32 | **KEEP** (1 **REFACTOR**) | 124 mutation hooks correctly authorized and invalidating. `banking.ts:38,39,52` carries the wire-shape drift the prior audit found, unfixed at head. |

---

## 9. Verdict

**PRD-C126 — partially met.** Six of the ten dimensions the criterion names are met and independently
evidenced (immutable tenant-safe ledgers, normalized expenses and reconciliation, queue-backed
exports/reminders, idempotent consumers, retention, transaction discipline). Four are not:

- **money correctness** — one P0 (F1) and five P1/P2 money defects with concrete triggers;
- **bounded indexed reads** — a client-side ceiling below realistic tenant size (F6) and 7 unenumerated N+1 sites;
- **authorization** — two live UI gates keyed to permissions no route declares (F7);
- **frontend states** — 27 of 121 data components render a failed load as a settled financial fact (F9).

**Production-shaped workflow tests are NOT MEASURED** and are the largest remaining unknown.

The single most urgent item is **F1**: a non-base-currency provider payment is received, acknowledged
with a 200, and never enters the ledger, with the receiver's own comment confirming no retry will
re-run the bridge.
