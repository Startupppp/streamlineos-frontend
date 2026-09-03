# 10 — Billing and Payments (PRD-C125) — second-pass audit at current head

**Predecessor:** `reports/10-billing-payments.md`. Its fixes are verified landed at head (§0). This
report does not repeat its work; it re-verifies its claims and pushes into what it left open.
Everything below was executed, not inferred. Where it was not, it says NOT MEASURED.

| | |
|---|---|
| Backend head | `2f37e1bb035006e5c03680497298ad62031e79d6` (`release/code-10-10-v2`), 17 commits after the prior audit's `959b0a89` |
| Frontend head | `7469d27895add587f9427e7c50c457f56e0048bf` (`release/code-10-10-v2`), 8 commits after the prior audit's `778f7d46` |
| Schema DB | `scratch_head_1010` — journal 677/677, 944 tables. **Zero rows in every billing table and zero organizations.** |
| Row-bearing DB | `scratch_perf_seed` — 25 invoices, **0 invoice_items, 0 subscriptions, 8 orgs**, 665 migrations applied = **12 behind head** |
| Consequence | **No database exists at head with billing rows.** No `EXPLAIN (ANALYZE, BUFFERS)` evidence for any billing read path is obtainable. See §7. |

---

## 1. Corpus read — with numbers

### Backend

| Dimension | Count | How enumerated |
|---|---|---|
| `src/modules/billing/**` TypeScript files | **118** (75 source, 43 spec) | `find … -name '*.ts'` |
| `src/modules/billing/**` directories | 9 (`core`, `core/__tests__`, `core/dto`, `payments`, `payments/adapters`, `payments/dto`, `payments/testing`, `payments/__snapshots__`, root) | `find -type d` |
| `src/modules/invoices/**` files | **23** | same |
| Controllers in territory | **8** (`billing`, `billing-enterprise`, `billing-marketplace`, `razorpay-webhook`, `payments`, `payment-webhooks-public`, `invoices`, `invoices-write`) | `grep -rl @Controller` |
| Route decorators | **77** — 34 `@Get`, 34 `@Post`, 7 `@Patch`, 2 `@Delete` | `grep -hoE '@(Get\|Post\|Put\|Patch\|Delete)\('` |
| Routes carrying `@RequirePermission` | **74 of 74 authenticated routes.** The 3 uncovered are deliberate: `GET /billing/plans` (`@AllowNoOrg @Universal`), `GET /billing/marketplace` (`@Universal`), `GET /billing/entitlements` (`@Universal`). The 2 webhook controllers are `@Public()` and gated by HMAC. | per-file grep, §4.6 |
| Routes carrying `@Idempotent` | 16 of 43 mutating routes; `pnpm check:idempotent-commands` exit 0 with 3 named skips (none in billing) | gate |
| Tables declared under `src/db/schema/billing/` | **39** across 10 files (billing 12, payment-providers 8, commercial-catalog 6, invoice-snapshot 5, usage-events 3, dunning/offer-fulfillment/proration-ledger/provider-webhook-events/seat-ledger 1 each) | `grep pgTable` incl. multi-line |
| Plus, in territory | `subscriptions`, `subscription_payments`, `coupons`, `coupon_redemptions` (`common/subscriptions.ts`); `platform_payments`, `platform_subscriptions` (`common/platform.ts`); `invoices`, `invoice_items` (`crm/invoicing.ts`) | grep |
| **Tables in territory, total** | **47** | |
| Spec files in billing + invoices | **52** | `find -name '*.spec.ts'` |

### Frontend

| Dimension | Count |
|---|---|
| Platform-billing routes | 2 — `/settings/billing`, `/settings/billing/ai-credits` |
| Customer-invoicing routes | 3 — `/billing/invoices`, `/billing/invoices/[invoiceId]`, `/billing/invoices/new` (+ `app/(authenticated)/billing/layout.tsx`) |
| Payment-provider route | 1 — `/accounting/settings/payment-providers` |
| `features/billing/**` files | **29** (14 top-level, 6 `components/`, 9 `new-invoice/`) |
| `features/payments/**` files | **11** (10 components, 1 lib) |
| Billing hook files | 5 — `invoice.ts`, `invoice-schema.ts`, `payments.ts`, `subscription.ts`, `subscription-schema.ts` |

`/billing`, `/billing/ai-credits`, `/settings/subscription`, `/billing/seats` remain **absent** — the
shared-CLAUDE §8 deletion still holds, nothing resurrected.

### Executed

```
jest --runInBand --testPathPattern="modules/(billing|invoices)/"
  EXIT=0   51 suites passed, 1 skipped (52 total) · 558 tests passed, 2 skipped
```

| Gate | Exit | Number produced |
|---|---|---|
| `check:idempotent-commands` | 0 | every in-scope mutating handler carries `@Idempotent`; 3 named skips |
| `check:tenant-isolation` | 0 | every tenant-owned service maps to ≥1 isolation test (existence, not execution) |
| `check:cache-invalidation` | 0 | 1076 service files · 187 write / 475 invalidate sites · 131 CACHE_KEYS factories |
| `check:outbox-consumers` | 0 | 24 emitted / 29 declared / 29 registered; `billing.revenue-event` present in all three |
| `check:unbounded-reads` | 0 | 2301 service files, 74 modules; 3 actionable unbounded (ratchet), 0 offset |
| `check:declaration-column-drift` (owner, head DB) | 0 | catalog half OK; `invoice_items.org_id` is trigger-supplied and undeclared **on purpose** |
| `check:declaration-constraint-drift` (owner, head DB) | 0 | 873 declared tables · 4948 declared constraints/indexes · 4323 live indexes · 5494 live constraints · 0 declared-but-absent tables |
| frontend `check:query-scope` | 0 | 5360 files |
| frontend `check:empty-states` | 0 | 3854 files |
| frontend `check:permission-binding` | 0 | 2384 bindings; 13 reads held back and counted, 0 unaccounted |
| frontend `check:gated-reads` | 0 | **self-declared vacuous for this territory** — it prints that it "DOES NOT COVER: features/** and app/** at all" and that it "reported 0 while 48 existed" |
| frontend `check:response-contracts` | 0 | 84/2665 parsed (3.2%); freezes the debt, does not retire it |

---

## 0. Prior-audit claims re-verified at head

| Prior claim | Status at head | Evidence |
|---|---|---|
| Deterministic revenue `eventId` prevents a double revenue row | **HOLDS** | `billing/core/deterministic-event-id.ts` present; `revenue-analytics.service.ts:46-50` branches on `dedupeKey`; producers at `billing-webhook-effects.ts:77,117` and `billing-payment-activation.ts:173` |
| Razorpay import-boundary spec rewritten and non-vacuous | **HOLDS** | in the 51 green suites |
| `GET /invoices/:id` joins line items | **HOLDS** | `invoices.service.ts` diff landed; `invoice-line-items-wire-shape.spec.ts` green |
| `features/payments/**` write controls gated | **HOLDS** | `useCan` present at credentials-tab:40, live-activation-panel:27, webhooks-tab:84, test-payment-tab:35, manual-methods-panel:31, provider-card:27 |
| No float **column** stores money | **HOLDS** — but the *computation* is float on the invoice write path. See F4. |  |
| DB-enforced invoice immutability | **HOLDS AND IMPROVED** — head now also has `trg_billing_invoice_snapshot_immutability`, `trg_billing_invoice_line_immutability`, `trg_billing_credit_note_immutability` | `pg_trigger` on `scratch_head_1010` |
| Claim not serialised (open P2) | **STILL OPEN** | `provider-event-ledger.ts:25-69` unchanged |
| `features/billing` mutating controls ungated; Void has no ConfirmDialog | **STILL OPEN** | `invoices-client.tsx` has zero `useCan`; `:109` Void fires straight through `handleMarkVoided` |
| denied/failed read renders as a permanent skeleton or an empty state | **STILL OPEN** | `readiness-rail.tsx:18`, `audit-tab.tsx:21` |
| `/billing/invoices/new` has no create gate | **STILL OPEN** | only `billing/layout.tsx:9` `enforceRouteAccess("/billing/invoices")` (a read key) |
| hardcoded ₹ | **STILL OPEN** — 10 sites; 1 (`payments-tab.tsx:23`) does it right |

The prior audit's §6 conclusion **"REMOVE candidates: none — every `@Module` under `billing/` is
reachable from `AppModule`"** is contradicted at head: module reachability is not feature
reachability. See F9.

---

## 2. Per-criterion assessment

### PRD-C125 — "Reconstruct current-head Billing/Payments evidence across plans, subscriptions, entitlements, seats, proration, usage, immutable invoices, tax/currency, idempotent provider events, replay-safe webhooks, cached feature gates, authorization, frontend states and sandbox failure tests."

**Status: PARTIALLY MET.** Ten of the fourteen named dimensions are reconstructed and sound. Four
carry defects, three of them P0. Walked in the order the criterion names them:

**1. Plans** — `PLAN_PRICES_PAISE` (`plan-entitlements.constants.ts:104-108`: STARTER 99 900,
PROFESSIONAL 249 900, ENTERPRISE 499 900 paise) plus a versioned catalog
(`billing_products` → `billing_plans` → `billing_price_versions`, `commercial-catalog.ts`) with
`effectiveFrom`/`effectiveUntil` windowing at `versioned-catalog.service.ts:76-106`. Sound.
**But the price's `currency` is discarded — see F1.**

**2. Subscriptions** — `subscriptions` + `subscription_items` + `subscription_payments`.
`verifyAndActivate` (`billing-payment-activation.ts:104-190`) does the whole transition in one
transaction and recovers from `uniq_subscription_payments_razorpay_payment` as an idempotent
success at `:176-181`. Sound.

**3. Entitlements** — `PlanLimitsService`. `fetchAllCounts` (`plan-limits.service.ts:188-215`)
resolves **14 quota counts in one statement**, not fourteen round trips — a deliberate anti-N+1.
Every subquery carries `WHERE org_id = $1`. A count-query failure raises
`ServiceUnavailableException` rather than defaulting to zero (`:216-219`), so a broken count
refuses the write instead of granting it. **KEEP, this is a positive control.**

**4. Seats** — `seat-definition.ts` exports `membersQuotaLockKey`/`lockMembersQuota`;
`seat-ledger.service.ts:73` takes it before counting and inserting. The `billing_seat_events`
idempotency arbiter is a **partial** unique index and the code supplies the matching predicate —
proven empirically, §4.1. Sound. The prior audit's cross-territory finding (5 of 6 membership-insert
sites inline the raw lock instead of calling the helper) is unchanged.

**5. Proration** — `proration-ledger.service.ts`. **`:93-95` refuses to prorate across currencies**
with an actionable message. That guard is the correct pattern and it is exactly the guard the
checkout path is missing (F1). `uq_billing_proration_org_idem` backs the idempotency key. KEEP.

**6. Usage** — `UsageMeteringService`. `acquireReservation` (`:101-140`) takes
`pg_advisory_xact_lock` on `usage:${orgId}:${meterKey}`, then reads usage and inserts in the same
transaction, so two callers cannot both see room for the last unit. Quantities are
`Number.isInteger`-checked. All three arbiters verified against the live catalog. **KEEP.**

**7. Immutable invoices** — `enforce_invoice_immutability` raises `check_violation` on any change to
subtotal/tax_rate/tax_amount/discount/total/currency/cgst/sgst/igst/exchange_rate of a non-DRAFT
invoice; the application refuses the edit independently at `invoices-update.service.ts:102`. Two
lines of defence. **KEEP.** Two gaps: `invoice_items` has **no** immutability trigger (F13), and the
trigger's `check_violation` is still mapped nowhere in `src/modules/invoices/` (carried, unfixed).

**8. Tax / currency — FAILS.** Three independent defects: **F1** (P0, checkout labels an INR-paise
amount with the tenant's accounting currency), **F2** (P0, editing a draft invoice zeroes the tax
while the GST split survives), **F4** (P1, float rounding understates GST by a paisa). `revenue_events`
has **no currency column at all** (`billing.ts:261-279`) while
`paymentWebhookPaymentSchema.currency` is required and discarded at
`billing-webhook-effects.ts:73,113`.

**9. Idempotent provider events** — 12 `ON CONFLICT` arbiters in territory, **all inferable**,
verified against `pg_indexes`/`pg_constraint` on the head DB (§4.1). `providerWebhookEvents` claim
is `RECORDED`/`RETRY`/`PROCESSED`/`FOREIGN`/`ERROR` with the composite `(org_id, provider,
provider_event_id)` arbiter. The claim window is still unserialised (prior audit's open P2), and
`redriveUnprocessed` still runs with no claim and no lock.

**10. Replay-safe webhooks — FAILS.** Signature verification is HMAC-SHA256 with
`timingSafeEqual` over the raw body, per-org secret, before any ledger write
(`razorpay.adapter.ts:169-177`; `payment-webhook-receiver.service.ts:166-196`). But the
**idempotency key on the public receiver is taken from an unsigned request header** (F3, P0), and
`redriveUnprocessed` bypasses the org-mismatch guard the live path enforces (F5, P1).

**11. Cached feature gates** — `getEntitlements` caches under `billing:entitlements:${orgId}`
(60 s) and `resolveTier` under an in-process `Map` keyed on `orgId` (30 s). **Both keys carry the
tenant dimension**, and `bust(orgId)` clears both. On the frontend, no query key carries an org at
all — `lib/query-keys.ts` has zero `orgId`/`tenant` mentions — but `useSwitchOrg`
(`hooks/common/auth-hooks.ts:170`) calls `queryClient.clear()` on every switch and `api-client.ts:215`
clears on 401, so no stale cross-tenant read is reachable through the switcher. The in-process tier
cache is per-process (F10, P2).

**12. Authorization** — 74/74 authenticated routes carry `@RequirePermission` with a namespaced key.
`useCan` fails closed (`hooks/api/access.ts:75-83`: `data ? … : false`) and is **not inert**:
`access-snapshot.resolver.ts:80` drops any permission whose scope is `"none"` before serialising, so
key presence is equivalent to grant. `check:permission-binding` passes over 2384 bindings.
The gap is the frontend **mutation** surface in `features/billing` (F11), which no gate covers.

**13. Frontend states** — `features/billing` handles `isError` at payments-tab:101,
billing-profile-tab:130, plan-tab:52, invoices-client:314. `features/payments` does not (F8).

**14. Sandbox failure tests** — the test/live seam exists (`payment_test_transactions`,
`environment` enum on providers and webhook endpoints, `payments:test:run` /
`payments:live:activate` as distinct permissions). `payment-webhook-security.spec.ts` covers
unconfigured-org 404, invalid-signature 401 with no ledger write, valid-signature 200, duplicate-200,
and a rate-limit-tier deny-by-default proof. **It does not cover the header-supplied event id**, which
is the branch F3 exploits; `payment-webhook-contract.spec.ts:17,21` covers "body id present, header
disagrees" and "neither present", and skips "header present, body id absent".

---

## 3. Findings

| Sev | File:line | Summary |
|---|---|---|
| **P0** | `src/modules/billing/core/billing-payment-activation.ts:199-209` | Checkout labels an INR-paise amount with the tenant's *accounting* base currency |
| **P0** | `src/modules/invoices/invoices-update.service.ts:120-128` | Editing a draft invoice's lines zeroes `tax_amount` and leaves CGST/SGST intact |
| **P0** | `src/modules/accounting/posting/journal-posting.service.ts:175-192` | `persistJournalEntry` writes POSTED entries with no balance assertion at any layer |
| **P0** | `src/modules/billing/payments/payment-webhook-receiver.service.ts:382-388` | The webhook idempotency key is taken from an unsigned request header |
| **P1** | `src/modules/invoices/lib/invoice-helpers.ts:8` | `Math.round(n*100)/100` understates GST by one paisa on realistic inputs |
| **P1** | `src/modules/billing/core/billing-webhook.handler.ts:110-149` | `redriveUnprocessed` bypasses the org-mismatch guard the live path enforces |
| **P1** | `src/modules/billing/payments/payment-webhook-receiver.service.ts:290-297` | Hardcoded `/100` minor-unit divisor paired with a pass-through currency code |
| **P2** | `src/modules/cron/cron-billing.service.ts:276-299` | Dunning churn emit has no dedupe key and never inspects its UPDATE's rowcount |
| **P2** | `frontend/features/payments/components/readiness-rail.tsx:18` | A failed read renders as a permanent skeleton |
| **P2** | `src/modules/billing/core/affiliate.service.ts:65` | Affiliate/referral is a write-only dead surface behind 6 live routes |
| **P2** | `src/modules/billing/core/plan-limits.service.ts:84,112-115` | The tier cache is per-process; `bust` does not reach sibling instances |
| **P2** | `frontend/features/billing/invoices-client.tsx:99,104,109,270` | Mutating controls render ungated; Void has no `ConfirmDialog` |
| **P2** | `frontend/app/(authenticated)/billing/invoices/new/page.tsx:1` | No route-level create gate; only the parent read gate applies |
| **P2** | `src/db/schema/crm/invoicing.ts:1` | `invoice_items` has no immutability trigger while `invoices` does |

### F1 — P0 — Checkout labels an INR-paise amount with the tenant's accounting base currency

`src/modules/billing/core/billing-payment-activation.ts:199-209`

```ts
private async billablePrice(orgId: string, plan: Plan, billingCycle: BillingCycle) {
  const catalogPrice = await this.deps.catalog.getActivePriceForPlanTier(plan);
  const currency = await this.currencyForOrg(orgId, catalogPrice?.currency);   // ← tenant's books
  const monthlyAmount = catalogPrice?.amountMinor ?? PLAN_PRICES_PAISE[plan];  // ← platform's list
```

The **amount** comes from the platform price list. The **currency** comes from
`accounting_settings.base_currency` (`:54-62`) — the tenant's own bookkeeping currency, which has
nothing to do with the price list. The catalog's own `currency` is used only as a fallback when the
org has no accounting-settings row.

The identical shape, with no fallback at all, is at `billing-marketplace.ts:35-38`:

```ts
const currency = await this.currencyForOrg(orgId);
const { providerOrderId: addonOrderId } = await adapter.createOrder({
  amount: String(pack.priceInPaise * quantity),
  currency,
```

**Failure scenario.** A new org (no POSTED journals, so the guard at
`accounting-settings.service.ts:50-59` passes) calls `PATCH /accounting/settings {"baseCurrency":"USD"}`.
It then calls `POST /billing/checkout {"plan":"STARTER"}`. `createOrder` (`:88-92`) sends the
provider `{ amount: "99900", currency: "USD" }`. The gateway charges **99 900 USD cents = $999**
instead of ₹999 — roughly 85×. `verifyAndActivate` (`:150-157`) then writes
`subscription_payments.amount_paise = 99900, currency = 'USD'`, so a column literally named *paise*
holds cents, and every revenue figure derived from it is wrong. The frontend compounds it:
`features/billing/components/plan-card.tsx:86` renders `₹{displayPrice}` unconditionally, so the
user is shown ₹999 for a $999 charge.

Reachable in reverse too: a USD catalog price with an INR-based org undercharges by the same factor.

**Not covered by any spec.** Every billing spec pins INR
(`billing-provider-contract.spec.ts:79` mocks `baseCurrency: "INR"`; `billing.service.spec.ts:397`
asserts `currency === "INR"`), so the mismatch branch is never exercised.

**Proposed fix.** Take amount and currency from the same source. `billablePrice` should return
`{ amount: catalogPrice.amountMinor, currency: catalogPrice.currency }` (or
`{ PLAN_PRICES_PAISE[plan], "INR" }`), and reject the checkout when the org's declared currency
differs — reusing the exact guard `proration-ledger.service.ts:93-95` already ships:
*"Cannot prorate across currencies (X → Y)"*. `billing-marketplace.ts` should use `"INR"` to match
`priceInPaise`. `currencyForOrg` should be deleted from the billing path; it belongs to accounting.

### F2 — P0 — Editing a draft invoice's line items zeroes the tax and strands the GST split

`src/modules/invoices/invoices-update.service.ts:120-128`, with
`src/modules/invoices/invoices-write.service.ts:110` and
`src/modules/invoices/dto/invoice-write.schemas.ts:62-71`

The create path computes GST **per line** and stores the split:

```ts
// invoices-write.service.ts:62-65, 110-124
const tax = round2(amount * (it.gstRate / 100));
…
taxRate: "0",                       // ← the header rate is ALWAYS zero
taxAmount: taxPool.toFixed(2),
cgstAmount: split.cgst.toFixed(4), sgstAmount: split.sgst.toFixed(4), igstAmount: split.igst.toFixed(4),
```

The update path computes tax from that **header** rate and never writes the split:

```ts
// invoices-update.service.ts:120-128
const taxRate  = input.taxRate ?? Number(existing.taxRate ?? 0);   // → 0
const taxAmount = Number((subtotal * (taxRate / 100)).toFixed(2)); // → 0
const total     = Number((subtotal + taxAmount - discount).toFixed(2));
updateData.taxAmount = taxAmount.toString();
// cgstAmount / sgstAmount / igstAmount are never assigned
```

`updateInvoiceSchema.lineItems` (`:62-71`) has **no `gstRate` field**, so the update input
structurally cannot carry the tax basis, and `:145` writes `gstRate: "0.00"` onto every replaced row.

**Failure scenario, traced.** Create a DRAFT invoice with one line, qty 1 × rate 1000 at gstRate 18,
intra-state → stored: `subtotal 1000.00, taxRate "0", taxAmount 180.00, cgst 90.0000, sgst 90.0000,
total 1180.00`. The user opens the Edit dialog: `features/billing/invoice-line-items.tsx:126` seeds
`editTaxRate = Number(taxRate ?? 0)` = **0**, and `:199-203` PATCHes `{lineItems, taxRate: 0}`.
After the save: `taxAmount 0.00, total 1000.00`, **`cgst 90.0000, sgst 90.0000` unchanged**. The
invoice now bills the customer ₹1000 while its GST columns claim ₹180 was collected.

Then the user issues it. `invoices-update.service.ts:53-57` derives the journal's tax pool from the
**stale split**, not from `taxAmount`:

```ts
const taxPool = Math.round((cgst + sgst + igst) * 100) / 100;   // = 180
```

and `postInvoiceSend` (`journal-posting.service.ts:186-192`) builds
AR **debit 1000** / revenue **credit 1000** / CGST **credit 90** / SGST **credit 90** —
**debits 1000, credits 1180.** `trg_invoice_immutability` then freezes the invoice permanently.

**Proposed fix.** Add `gstRate` to `updateInvoiceSchema.lineItems`, recompute the pool per line and
re-derive the split through `posting.gstSplit`, and write `cgstAmount`/`sgstAmount`/`igstAmount` in
the same UPDATE. Until then, refuse any line-item edit on an invoice whose `cgst+sgst+igst > 0`.

### F3 — P0 — `persistJournalEntry` writes POSTED entries with no balance assertion

`src/modules/accounting/posting/journal-posting.service.ts:175-192`

`persistJournalEntry` inserts `journalLines` straight from the draft. It never calls
`assertDebitsEqualsCredits`, which the repo ships at
`src/modules/accounting/core/money.util.ts:188` and which **only** `finance-posting.service.ts:125`
(the `gl_*` kernel) invokes. Verified in the live catalog: `journal_entries` and `journal_lines`
carry **zero CHECK constraints**.

```
psql> select conname from pg_constraint where conrelid='journal_entries'::regclass and contype='c';
(0 rows)
psql> select conname from pg_constraint where conrelid='journal_lines'::regclass  and contype='c';
(0 rows)
```

So an unbalanced double entry can be POSTED with no guard in code, in the schema, or in a trigger.
F2 is one concrete producer; any other inconsistency in `postInvoiceSend` / `postPaymentReceipt`
input has the same free path. The damage is silent and permanent: the trial balance drifts and
nothing surfaces it.

**Proposed fix.** Call `assertDebitsEqualsCredits(draft.lines)` at the top of `persistJournalEntry`,
and add a deferred constraint trigger on `journal_entries` asserting
`SUM(debit) = SUM(credit)` over its lines at COMMIT — the DB backstop that `invoices` already has
for immutability and that the ledger does not have for balance.

### F4 — P0 — The webhook idempotency key is taken from an unsigned request header

`src/modules/billing/payments/payment-webhook-receiver.service.ts:369-389`

```ts
export function resolveProviderEventId(header, normalized, rawBody) {
  const supplied = header?.trim();
  if (supplied && normalized.providerEventId && supplied !== normalized.providerEventId)
    return { ok: false };                                   // ← armed only when the BODY has an id
  return { ok: true, id: supplied || normalized.providerEventId || sha256(rawBody) };
}                                       //          ↑ the unsigned header wins outright
```

The header arrives from a `@Public()` route —
`payment-webhooks-public.controller.ts:29,31` (`x-payment-event-id`, `x-razorpay-event-id`) — and the
signature (`razorpay.adapter.ts:172`) is an HMAC over `rawBody` **only**. The mismatch guard is
inert whenever the adapter cannot extract an id from the body, which is precisely the case the
`sha256(rawBody)` fallback exists to serve.

**Failure scenario.** Take one captured, correctly-signed webhook body. Replay it N times, varying
`x-razorpay-event-id` each time.

1. `verifyWebhookSignature` passes every time — the header is not covered by the HMAC.
2. The `paymentWebhookEvents` arbiter is `(provider_id, environment, provider_event_id)`
   (`uq_payment_webhook_events_provider_env_event`, confirmed in `pg_indexes`), so each varied
   header inserts a **new** row and `!inserted` is false.
3. `:290` therefore re-runs `providerBridge.recordProviderPayment` with that same varied id.
4. `provider-bridge.service.ts:68-71` posts a journal with `sourceId = input.providerEventId`.
5. `finance-posting.service.ts:140-155` dedupes on `(orgId, sourceType, sourceId, sourceEvent)`,
   backed by `uniq_je_idempotency` — but each replay carries a **distinct** `sourceId`, so the
   dedupe never fires.

Result: N POSTED journal entries, each debiting BANK_CLEARING and crediting AR for the full amount,
from one real payment. `billing:webhook` is limited to **600/min** (`rate-limit.service.ts:118`), so
the amplification ceiling is 600 fabricated revenue postings per minute per provider.

The sibling path is safe and shows the correct shape: `billing-webhook.handler.ts:80` uses
`normalized.providerEventId ?? payment.id` and never reads a header.

**Untested.** `payment-webhook-contract.spec.ts:17` covers "body id present, header disagrees" and
`:21` covers "neither present". The vulnerable branch — header present, body id absent — is not
covered by any of the 52 specs.

**Proposed fix.** Invert the precedence: `id: normalized.providerEventId || sha256(rawBody)`. Keep
the header purely as a cross-check that 400s on disagreement (which it already does), never as the
value. That change alone closes the amplification without any schema work.

### F5 — P1 — `round2` understates GST by one minor unit on realistic invoice inputs

`src/modules/invoices/lib/invoice-helpers.ts:8`, used at `invoices-write.service.ts:63,64,68,71,74,75`;
mirrored client-side at `frontend/features/billing/new-invoice/new-invoice-schema.ts:61`

```ts
export const round2 = (n: number): number => Math.round(n * 100) / 100;
```

Measured against exact half-up decimal arithmetic (`node`, BigInt at scale 4):

| Input | `round2` | exact half-up |
|---|---|---|
| ₹10.75 line @ 18% GST | **1.93** | 1.94 |
| ₹6.75 @ 18% | **1.21** | 1.22 |
| ₹5.75 @ 18% | **1.03** | 1.04 |
| ₹1.25 @ 18% | **0.22** | 0.23 |
| ₹0.70 @ 5% | **0.03** | 0.04 |
| qty 1 × rate 1.005 | **1.00** | 1.01 |

The error is always **downward** (the double nearest `x*100` falls just below the .5 boundary), so it
is a systematic under-statement of output GST, not noise that cancels. It compounds per line, is
frozen at issue by `trg_invoice_immutability`, and lands in GSTR filings.

The repo already ships exact decimal arithmetic — `src/modules/accounting/core/money.util.ts`,
BigInt at scale 4, with `multiplyDecimals`, `roundDecimal`, `addDecimals`. `invoices-write.service.ts`
does not import it.

**Proposed fix.** Replace `round2` with `roundDecimal(multiplyDecimals(qty, rate), 2)` on decimal
strings end to end, and mirror the same on the client (or, better, stop recomputing on the client
and render what the server returns — see F12).

### F6 — P1 — `redriveUnprocessed` bypasses the org-mismatch guard the live path enforces

`src/modules/billing/core/billing-webhook.handler.ts:92-99` vs `:110-149`

The live path refuses a webhook whose `payment.notes` name a different organization:

```ts
const org = await this.state.findOrgFromNotes(payment.notes);
if (org && org.id !== orgId) return { status: 400, body: { …"organization mismatch" } };
```

but returns **before** stamping `processed_at`, so the ledger row persists unprocessed.
`redriveUnprocessed` then picks that exact row up (`listRedrivable` selects on
`processed_at IS NULL` and an age window) and calls `settle(parsed.data, payment, orgId, …)` with
**no `findOrgFromNotes` check at all**.

**Failure scenario.** A signed event whose notes name org B is delivered to org A's endpoint. Live
path: 400, row recorded unprocessed. `minAgeMs` later, the redrive sweep settles it into org A —
`persistPayment(payment, orgId=A)` writes the payment under A, and `effects.apply` grants A the AI
credits from `payment.notes.packId`. The guard that exists to stop exactly this is skipped on the
replay path.

**Proposed fix.** Either run `findOrgFromNotes` inside `settle` so both entrances share it, or stamp
the mismatch rows with a terminal state at `:96` so `listRedrivable` cannot select them.

### F7 — P1 — Hardcoded `/100` minor-unit divisor paired with a pass-through currency

`src/modules/billing/payments/payment-webhook-receiver.service.ts:290-297`

```ts
grossAmount: String(paymentEntity.amount / 100),
feeAmount:   String(typeof paymentEntity.fee === "number" ? paymentEntity.fee / 100 : 0),
currency:    typeof paymentEntity.currency === "string" ? paymentEntity.currency.toUpperCase() : "INR",
```

`100` is a 2-decimal-currency assumption. Providers report JPY / KRW / VND in **whole units**
(divisor 1) and KWD / BHD / JOD in **thousandths** (divisor 1000). A ¥100 000 capture is recorded as
1 000.00 JPY — a 100× understatement — and posted straight to the ledger by
`provider-bridge.service.ts:29-36`, which then does `gross - fee` in IEEE-754 doubles rather than
through `money.util.ts`.

**Proposed fix.** Derive the exponent from the currency code (a small ISO-4217 table), and do the
scaling on decimal strings.

### F8 — P2 — Dunning churn emit has no dedupe key and never inspects its UPDATE

`src/modules/cron/cron-billing.service.ts:276-299`

`processTrialExpiry` (`:56-77`) is correct: it emits only over the rows its `UPDATE … .returning()`
actually flipped, so a concurrent second sweep gets zero rows and emits nothing.
`processDunning` does not follow that pattern — it issues the UPDATE, discards the result, and emits
unconditionally with **no `dedupeKey`**:

```ts
await this.db.update(subscriptions).set({ status: "CANCELLED", … })
  .where(and(eq(subscriptions.id, sub.id), eq(subscriptions.status, "PAST_DUE")));
await this.revenue.emit(tx, { type: "churn", orgId: sub.orgId, plan: sub.plan,
  mrr: PLAN_PRICES_PAISE[sub.plan as Plan] ?? 0, metadata: { … } });   // ← no dedupeKey
```

Two concurrent dunning sweeps both read the subscription as PAST_DUE; one UPDATE matches, the other
matches zero rows, and **both** emit `churn` with a fresh `randomUUID()`, so `revenue_events`
double-counts the MRR loss. The prior audit's deterministic-id mechanism is available and unused here.

**Proposed fix.** `const [flipped] = await …returning({id})` and emit only `if (flipped)`, plus
`dedupeKey: \`dunning-suspension:${sub.id}\`` as defence in depth.

### F9 — P2 — A failed or denied read renders as a permanent skeleton or as "no data"

- `frontend/features/payments/components/readiness-rail.tsx:18` — `if (isLoading || !readiness)`
  returns skeletons. On error the query settles with `data === undefined` and `isLoading === false`,
  so `!readiness` stays true and the rail shows **loading forever**. There is no `isError` branch.
- `frontend/features/payments/components/audit-tab.tsx:21` — a 500 or a 403 renders
  `EmptyState "No audit events yet — Provider changes will be logged here."` An error looks like a
  clean audit trail, which is the worst possible reading for an audit surface.

`hooks/api/gated-query.ts` ships the `access` half and `hooks/api/invoice.ts:80,101,116` consume it;
**no `features/payments/**` screen does.** `check:empty-states` cannot catch this — it checks that
empty states go through `EmptyState`, which these do.

### F10 — P2 — Affiliate and referral are a write-only dead surface behind 6 live routes

`src/modules/billing/core/affiliate.service.ts:65`, `src/modules/billing/core/referral.service.ts:58,75`

`AffiliateService.creditCommission`, `ReferralService.processSignup` and
`ReferralService.activateReferral` have **zero callers anywhere outside their own files**
(`grep -rn … src/modules | grep -v spec` → nothing). Six routes on
`billing-enterprise.controller.ts:43-86` create `affiliates` and `referrals` rows that nothing ever
advances: `referrals.status` never leaves `PENDING`, `referrals.reward_granted` is never written, and
`affiliate_commissions` is never inserted. The module is registered in `AppModule`, which is why the
prior audit's reachability test returned "REMOVE candidates: none" — module reachability is not
feature reachability.

Three latent defects inside the dead code, which would bite the moment it is wired:
- `referral.service.ts:7` mints a bearer referral code from **`Math.random()`** — a non-cryptographic,
  state-recoverable PRNG.
- `referrals_code_idx` is **not unique** (confirmed in `pg_indexes`), and `processSignup` reads
  `[referral] = await select().where(eq(referralCode, code))` with no `ORDER BY` and no `LIMIT`, so a
  collision resolves arbitrarily.
- `creditCommission` inserts into `affiliate_commissions` with no idempotency key and no unique
  constraint; the atomic-counter comment at `:96-101` fixed the double-write on the *counter* but not
  on the *row*.

**Classification: REMOVE**, or finish it. Shipping six permissioned routes that write rows the
product never reads is worse than shipping neither.

### F11 — P2 — The entitlements tier cache is per-process

`src/modules/billing/core/plan-limits.service.ts:84, 93-107, 112-115`

`tierCache` is a plain in-process `Map` with a 30 s TTL. `bust(orgId)` clears **this process's** map
plus the shared `billing:entitlements:${orgId}` key. With more than one instance behind the load
balancer, a downgrade or a cancellation processed on instance A leaves instance B serving the old
tier — and therefore the old `assertWithinLimit` ceiling and the old `assertFeature` answer — for up
to 30 s. Bounded and small, but it is a plan gate that keeps saying yes after the plan said no.

**Proposed fix.** Either drop the local map and rely on `CacheService` (which `bust` already
invalidates cluster-wide), or publish the bust over the same channel the cache uses.

### F12 — P2 — `features/billing` mutating controls render ungated; Void has no confirmation

`frontend/features/billing/invoices-client.tsx` has **zero** `useCan` / `useAccess` calls. Rendered
unconditionally: Mark Issued (`:99`), Mark Paid (`:104`), **Void** (`:109`), New Invoice (`:270`,
`:326`). The same for `invoice-detail-actions.tsx`, `record-payment-dialog.tsx:240`,
`new-invoice/new-invoice-form.tsx:44`, `components/plan-card.tsx:103`. The backend refuses
(`accounting:create|update|manage`, `billing:subscription:manage`), so this is disclosure and UX, not
escalation — but frontend/CLAUDE.md §17 requires the control be hidden.

Void additionally has **no `ConfirmDialog`** — `:109` calls `handleMarkVoided` directly, and §13
makes confirmation a hard rule for a destructive action. Voiding also reverses the invoice's journal
entry (the toast at `:174` says so), so a misclick is a ledger write.

**No gate covers this.** `check:gated-reads` prints that it "DOES NOT COVER: features/** and app/**
at all"; `check:permission-binding` covers reads, not mutations. Both are green.

Related, same territory: `features/billing/new-invoice/new-invoice-form.tsx:48-66` recomputes the
whole invoice — subtotal, per-line GST, the CGST/SGST/IGST split, and the grand total — in the client
and displays it, while `invoices-write.service.ts:62-75` recomputes independently on the server. Two
implementations of one tax calculation is one too many; with F5 they can and do disagree.

### F13 — P2 — `/billing/invoices/new` has no create gate

`frontend/app/(authenticated)/billing/invoices/new/page.tsx` performs no access check. The only gate
in the chain is `app/(authenticated)/billing/layout.tsx:9` —
`enforceRouteAccess("/billing/invoices")`, a **read** key. Anyone who can read invoices can load the
full creation form; the backend's `accounting:create` refuses only on submit.

### F14 — P2 — `invoice_items` has no immutability trigger while `invoices` does

`enforce_invoice_immutability` freezes ten financial columns on the header of a non-DRAFT invoice.
The **lines** carry no such trigger — `pg_trigger` on `invoice_items` holds only
`trg_set_org_id` (the org_id backfill). A non-DRAFT invoice's `amount`, `quantity` and `rate` can be
UPDATEd or DELETEd at the SQL level with the header left intact, and the header would then disagree
with the sum of its lines with no error raised. The only defence is
`invoices-update.service.ts:102`. Given the header already has a DB backstop, the asymmetry is the
finding.

Carried and still true: the trigger's `check_violation` is caught nowhere in `src/modules/invoices/`,
so a bypass surfaces as a 500 rather than the trigger's actionable message, even though
`common/db/postgres-error.ts` exports `isCheckViolation`.

---

## 4. What head already gets right

Recorded as evidence, not as filler — each of these is a place the named failure shapes were looked
for and not found.

**4.1 Every `ON CONFLICT` arbiter in territory is inferable, including the two partial ones.**
Twelve arbiters checked against `pg_indexes`/`pg_constraint` on `scratch_head_1010`. Two target
**partial** unique indexes, which Postgres cannot infer without a matching predicate — and both
supply it. Proven, not assumed:

```
psql> INSERT INTO billing_seat_events … ON CONFLICT (org_id, idempotency_key) DO NOTHING;
ERROR:  there is no unique or exclusion constraint matching the ON CONFLICT specification
psql> INSERT INTO billing_seat_events … ON CONFLICT (org_id, idempotency_key)
        WHERE idempotency_key IS NOT NULL DO NOTHING;
ERROR:  … violates foreign key constraint …          ← arbiter accepted, reached the FK
```

`seat-ledger.service.ts:88-91` passes `where: sql\`idempotency_key IS NOT NULL\``;
`versioned-catalog.service.ts:194-199` passes `targetWhere` **and** `setWhere`. Both correct.

**4.2 `this.db` is tenant-aware, so the mixed `this.db`/`tx` usage in the cron sweeps is one
transaction, not two.** `createTenantAwareDb` (`common/tenant/tenant-db.ts:14-25`) proxies every
property to the ambient tenant tx when one is in flight, and `TenantContextInterceptor` is a global
`APP_INTERCEPTOR` (`app.module.ts:216`). This was the first thing I suspected in
`processDunning`, and it is a false alarm.

**4.3 RLS covers 37 of the 45 tenant-bearing billing tables**, one policy each, `relforcerowsecurity
= false` throughout. The 8 without RLS are `billing_plans`, `billing_products`,
`billing_price_versions`, `billing_plan_entitlements`, `ai_credit_packs`, `marketplace_apps` — all
platform-global catalogs, correctly policy-free — plus `referrals` and `affiliate_commissions`,
which carry org columns but are inherently cross-tenant relations and are dead code anyway (F10).

**4.4 Webhook signature verification is correct.** HMAC-SHA256 over the raw body with the per-org
webhook secret, compared with `timingSafeEqual` behind a try/catch that returns `false` on a length
mismatch (`razorpay.adapter.ts:22-34, 169-177`), performed **before** any ledger write
(`payment-webhook-receiver.service.ts:166-196`), with a `recordSignatureFailure` audit trail on
rejection. `payment-webhook-security.spec.ts` proves the 401 writes no ledger row.

**4.5 `useCan` is not an inert gate.** It fails closed on absent data
(`hooks/api/access.ts:77`: `data ? … : false`) and its presence test is sound because
`access-snapshot.resolver.ts:80` drops any permission resolved to scope `"none"` before serialising.

**4.6 Backend authorization is complete.** 74/74 authenticated routes across the six non-public
controllers carry `@RequirePermission` with a namespaced key. The three `@Universal()` exceptions
are the public price list, the public marketplace listing, and `GET /billing/entitlements` (which is
org-scoped by `CurrentUser`, not by the decorator).

**4.7 `fetchAllCounts` is a deliberate anti-N+1** — 14 quota counts in one statement, all
org-filtered, with a `ServiceUnavailableException` rather than a silent zero on failure.

**4.8 Frontend cross-tenant cache safety.** No query key carries an org, but
`useSwitchOrg` (`hooks/common/auth-hooks.ts:170`) calls `queryClient.clear()` on every switch and
`api-client.ts:215` clears on a terminal 401. `check:query-scope` is green over 5360 files.

**4.9 Immutability coverage grew since the prior audit** — head adds
`trg_billing_invoice_snapshot_immutability`, `trg_billing_invoice_line_immutability` and
`trg_billing_credit_note_immutability` alongside the three the prior audit found.

**4.10 `uniq_je_idempotency (org_id, source_type, source_id, source_event)` closes the concurrent
double-post race** in `finance-posting.service.ts:140-155`. The SELECT-then-INSERT there looks like a
check-then-insert race, but the unique index makes the loser abort. (It does not help against F4,
which varies `source_id` itself.)

**4.11 Cross-currency proration is refused** (`proration-ledger.service.ts:93-95`) with an actionable
message. This is the guard F1 needs and does not have.

**4.12 Declaration-vs-catalog parity holds** at head: column-drift and constraint-drift gates both
exit 0 against `scratch_head_1010`, 873 tables compared, 0 declared-but-absent.

---

## 5. File classification

| Path | Verdict | Reason |
|---|---|---|
| `src/modules/billing/core/**` (except below) | **KEEP** | 75 source files, all reachable from `AppModule`; webhook/ledger/proration/seat/usage logic is the live path |
| `src/modules/billing/payments/**` | **KEEP** | provider-neutral adapter seam; signature verification, audit trail and env separation all sound |
| `billing/core/plan-limits.service.ts` | **KEEP** | one-statement quota read, fail-closed; only F11's per-process cache to fix |
| `billing/core/usage-metering.service.ts` | **KEEP** | advisory lock + idempotency key + integer quantities; all three arbiters verified |
| `billing/core/proration-ledger.service.ts` | **KEEP** | the cross-currency guard other paths should copy |
| `billing/payments/testing/fake-provider-adapter.ts` | **KEEP** | 8 specs import it; `assertion-ceiling-ledger.json:328` names it |
| `billing/core/billing-payment-activation.ts` | **REFACTOR** | F1 — amount and currency must come from one source |
| `billing/core/billing-marketplace.ts` | **REFACTOR** | F1 — `priceInPaise` labelled with the tenant's books currency |
| `billing/payments/payment-webhook-receiver.service.ts` | **REFACTOR** | F4 (header-derived idempotency key), F7 (hardcoded `/100`) |
| `billing/core/billing-webhook.handler.ts` | **REFACTOR** | F6 — the redrive path must share the live path's org guard |
| `invoices/invoices-update.service.ts` + `invoices/dto/invoice-write.schemas.ts` | **REFACTOR** | F2 — the update input cannot express the tax basis it must preserve |
| `invoices/lib/invoice-helpers.ts` | **REFACTOR** | F5 — replace `round2` with `money.util.ts` decimal arithmetic |
| `accounting/posting/journal-posting.service.ts` | **REFACTOR** | F3 — no balance assertion (ticket-11 file, reached from the ticket-10 invoice path) |
| `billing/core/affiliate.service.ts`, `billing/core/referral.service.ts` | **REMOVE** | F10 — zero external callers; 6 permissioned routes write rows nothing advances |
| `db/schema/billing/invoice-snapshot.ts` → `billing_invoice_number_sequences` | **AMBIGUOUS** | unchanged from the prior audit: 0 runtime consumers, 0 spec references; not proven dead |
| `frontend/features/payments/**` | **KEEP** | write controls now gated; needs F9's error branches |
| `frontend/features/billing/invoices-client.tsx`, `invoice-detail-actions.tsx` | **REFACTOR** | F12 — gate the mutations, confirm the Void |
| `frontend/features/billing/new-invoice/new-invoice-form.tsx` | **REFACTOR** | duplicate tax engine; render the server's numbers instead |

---

## 6. Regressions and improvements since the prior audit

**Improved:** the deterministic revenue-event id, the invoice line-item join, the payments write-control
gating, and the razorpay import-boundary spec are all landed and verified. Three additional
immutability triggers now exist. Both drift gates now pass against a head-schema database that did
not exist when the prior audit ran.

**Degraded:** the row-bearing database drifted from 7 to **12 migrations behind head**, so the prior
audit's cost-measurement capability is gone entirely (§7).

**Unchanged and still open:** the unserialised claim window, the uncaught `check_violation`, and the
whole frontend open list.

---

## 7. NOT MEASURED — and exactly what would measure it

**No performance or cost evidence was gathered, and none is obtainable at head.**

- `scratch_head_1010` is at journal head (677/677, 944 tables) but holds **0 organizations and 0 rows
  in every billing table** — `invoices`, `invoice_items`, `subscriptions`, `revenue_events`,
  `provider_webhook_events`, `payment_webhook_events`, `billing_usage_events`, `platform_payments`
  all count 0. A plan over empty relations is a seq-scan of nothing; it measures the planner, not
  the query.
- `scratch_perf_seed` holds rows (25 invoices, 8 orgs) but has **665 of 677 migrations applied** — 12
  behind head — and holds **0 `invoice_items` and 0 `subscriptions`, so the two reads I most wanted
  to cost (the invoice line-item join added by the prior audit, and `plan-limits.fetchAllCounts`)
  have no data on either database.

**What would measure it:** a seeded database at journal head with tenant skew — the
`aaaaaaaa-1111-0000-0000-00000000000{1..4}` at 89.93 / 9.00 / 0.90 / 0.18 % that the prior audit
used — carrying at least: subscriptions for every org, ≥10 000 `invoices` with ≥3 `invoice_items`
each, ≥50 000 `billing_usage_events` across ≥5 meters, and ≥10 000 `revenue_events`. Then, as
`streamline_app` with `app.organization_id` set to the **smallest** tenant (index-prefix regressions
only show under skew):

1. `EXPLAIN (ANALYZE, BUFFERS)` on `InvoicesService.getInvoice`'s items join — confirm
   `idx_invoice_items_invoice` is chosen and that buffers do not grow with the org's total invoice
   count.
2. `EXPLAIN (ANALYZE, BUFFERS)` on `plan-limits.fetchAllCounts` — 14 correlated subqueries over 14
   tables in one statement is the single hottest billing read; it runs on every entitlements miss.
3. `EXPLAIN (ANALYZE, BUFFERS)` on `revenue-analytics`'s aggregation reads
   (`revenue-analytics.service.ts:125,163,195,210`) — `revenue_events` has indexes on `type` and
   `created_at` **separately** and none on `(org_id, created_at)`, which is the predicate these use.

Also not measured:
- **The F4 replay amplification end to end.** Demonstrating it needs a running backend with a
  configured provider and a valid webhook secret. The code path is traced line by line above and the
  dedupe arbiters are confirmed in the live catalog, but no HTTP request was issued.
- **`check:replay-ledger`** — needs `COLD_DATABASE_URL` pointed at `scratch_cold_1010`; not run here,
  it is ticket 03's gate and was reported green in the shared context.
- **RLS execution proof** — `check:tenant-isolation` proves a test *exists* per service, not that it
  passes. `check:tenant-isolation:run` was not executed (the shared context's laptop budget forbids
  broad suites); the 51 green billing/invoices suites include 11 `*-tenant-isolation.spec.ts` files
  and all passed.

---

## 8. Blocked on infrastructure

Only the performance evidence in §7, and only because no head-schema database with billing rows
exists on this machine. Nothing else in this ticket is blocked: every finding above was reached by
reading code, querying the live catalog, or running a gate.

The reproducible blocker to hand to whoever seeds the next database: **`scratch_perf_seed` must be
rebuilt at journal 677 and must write `invoice_items` and `subscriptions`.** The prior audit already
recorded that `invoice_items` held 0 rows and that "the emptiness independently corroborates the
defect: nothing on this database would ever have surfaced the empty-PDF bug." That is still true, and
it is now also true of `subscriptions`, which means the entire plans/entitlements/seats read surface
is unmeasurable.
