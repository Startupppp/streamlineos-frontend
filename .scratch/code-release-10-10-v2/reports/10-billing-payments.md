# 10 — Billing and Payments (PRD-C125)

**Status:** audited and partly fixed. Evidence below is current-head and was executed, not inferred.

| | |
|---|---|
| Backend commit measured at | `959b0a8948a324839a0926a3e35afee97870f563` (`release/code-10-10-v2`) |
| Frontend commit measured at | `778f7d467f7fce5f890f06d006bd745bf3157748` (`release/code-10-10-v2`) |
| Database measured | `scratch_perf_seed`, local Postgres. Journal **665/665 applied; repo journal is now 672**, so the seed is **7 migrations behind head**. |
| Role used | `streamline_app` — verified `rolbypassrls = f`, `rolsuper = f` |
| Tenant GUC | `app.organization_id` (not `app.current_org_id`; the latter is the reader function and setting it raises `42501`) |
| Tenants in skew | `aaaaaaaa-1111-0000-0000-00000000000{1..4}` at 89.93 / 9.00 / 0.90 / 0.18 % |

Both repos typecheck clean at the state described here (`tsc --noEmit`, exit 0 each — see §5).

---

## 1. The P0: a re-settled provider webhook could post a second revenue row

### What was wrong

`BillingWebhookHandler.settle` (`src/modules/billing/core/billing-webhook.handler.ts:155-189`) is
*record → act → acknowledge*. The ledger claim
(`src/modules/billing/core/provider-event-ledger.ts:25-69`) commits its `INSERT` in its own
transaction and then returns:

* `RECORDED` — this caller inserted the row;
* `RETRY` — the row exists with `processed_at IS NULL`, so *"the work must run again"* (the comment at
  `provider-event-ledger.ts:7` states this is deliberate).

Nothing serialises the window between the claim committing and `processed_at` being stamped. Two
settles of one provider event are therefore reachable two ways:

1. **Concurrent redelivery.** Delivery A inserts and gets `RECORDED`; delivery B, arriving before A
   acknowledges, conflicts, reads `processed_at IS NULL` and gets `RETRY`. Both proceed.
2. **Redrive racing a live retry.** `redriveUnprocessed` (`billing-webhook.handler.ts:110-149`)
   selects unprocessed rows with **no lock and no claim** (`listRedrivable`,
   `provider-event-ledger.ts:110-133`) and settles them; a provider retry landing at the same moment
   takes the `RETRY` branch.

The **AI-pack credit grant** survives both — it runs inside
`externalEffectLedger.execute` with a stable `effectKey` (`billing-webhook-effects.ts:61-70`), and
the loser gets `ExternalEffectLeaseBusyError` → 503. **The revenue events did not.**
`RevenueAnalyticsService.emit` minted a fresh `randomUUID()` per call
(`revenue-analytics.service.ts:43`) and used it as both `eventId` and `aggregateId`. Both of the
outbox's unique indexes — `uniq_outbox_events_event_id` and `uniq_outbox_events_org_agg_version`
(`src/db/schema/common/outbox.ts:63-69`) — were therefore keyed on a value that differed per call,
and `InboxConsumer.claim` dedupes on `producer_event_id` (`common/outbox/inbox-consumer.ts:38-53`),
i.e. on that same per-call UUID. Two settles ⇒ two distinct outbox rows ⇒ two `revenue_events`
rows for one payment. A refund or an add-on purchase could be counted twice.

The **sequential** failure path was already safe and remains so: the revenue emit and the
`processed_at` stamp share one transaction (`billing-webhook.handler.ts:174-177`), so a failed
acknowledge rolls the revenue emit back. Only the concurrent window was open.

### The fix

`src/modules/billing/core/deterministic-event-id.ts` (new) — a UUIDv5 over the caller's parts.
`RevenueEventInput` gains an optional `dedupeKey` (`revenue-events.ts`); when present,
`emit` derives `eventId` from `(REVENUE_EVENT_TYPE, orgId, type, dedupeKey)` instead of
`randomUUID()` (`revenue-analytics.service.ts:42-50`). Producers supply it:

* `billing-webhook-effects.ts` — `dedupeKey: \`${providerKey}:${payment.id}\`` on both the
  `addon_purchase` and the `refund` event;
* `billing-payment-activation.ts:173` — `verify-and-activate:${paymentId}` (defence in depth; that
  path was already protected by `uniq_subscription_payments_razorpay_payment`).

A second settle now collides on `uniq_outbox_events_event_id`, aborting its transaction and
returning 500; the provider's next retry reads `PROCESSED` and returns 200. Exactly one revenue row
commits under every interleaving. A producer with no stable identity still gets a fresh UUID, so
nothing is silently suppressed.

### Proof

`src/modules/billing/core/revenue-event-replay.spec.ts` (new, 7 cases) drives the **real**
`BillingWebhookEffects.apply` and the **real** `RevenueAnalyticsService.emit` twice — the shape
`settle` produces — and asserts on the rows handed to the outbox.

```
pnpm exec jest --runInBand --testPathPattern="revenue-event-replay|billing-webhook|provider-event-ledger|revenue-events"
EXIT=0   4 suites passed, 70 tests passed
```

**Bite test** (the spec is not vacuous). Reverting `emit` to `randomUUID()` unconditionally:

```
pnpm exec jest --runInBand --testPathPattern="revenue-event-replay"
BITE EXIT=1   Tests: 3 failed, 4 passed, 7 total
```

The three that fail are exactly the identity assertions; the control case — *"an event without a
dedupe key still gets a fresh id each time"* — passes in both runs, pinning that the mechanism, not
luck, is doing the work. Source restored and re-verified after the bite.

### Still open (not fixed)

The **claim itself is still not serialised**. The deterministic id makes the *revenue ledger*
exactly-once, which is what made this a P0, but a concurrent double-settle still does duplicate work
(re-persists the payment, re-enters `effects.apply`) before one side loses. A durable fix is a
per-`(org, provider, providerEventId)` advisory lock held across `settle`, matching the
`quota:${orgId}:members` pattern in `billing/core/seat-definition.ts`. **Severity P2** — no
incorrect state results today, only wasted work and a 500 the provider retries through.

---

## 2. Money units (PRD-C050)

**No float column stores money anywhere in the schema.** `doublePrecision`/`real` appear 9 times
across `src/db/schema/**` and every one is a confidence/score/ratio (`party/party-roles.ts`,
`crm/*`, `common/cell-capacity.ts`) — none is an amount. Billing amounts are integer paise
(`amountPaise integer`, `PLAN_PRICES_PAISE`); accounting amounts are `numeric` handled through
`src/modules/accounting/core/money.util.ts`, which is exact bigint arithmetic at scale 4.

`coupon-pricing.ts` is a **positive control worth preserving**: `numericToPaise`
(`billing/core/coupon-pricing.ts:35-47`) deliberately parses a `numeric(15,2)` string to integer
paise without float arithmetic, and `parseFloat` survives only on the *percentage rate*
(`:55`), which is not an amount. **KEEP.**

The dead-`23505` trap from project memory **does not exist in my territory**: a grep for
`code === "23505"` across `billing/ finance/ accounting/ invoices/ expenses/ quotes/` returns zero,
and `common/db/postgres-error.ts` already walks the bounded `cause` chain and reads
`constraint_name`/`table_name` rather than node-postgres's names.

---

## 3. Immutable invoices — DB-enforced, and it holds

Measured on `scratch_perf_seed` as owner (catalog read, no rows involved):

```
invoices        trg_invoice_immutability        enforce_invoice_immutability
journal_entries trg_journal_entry_immutability  enforce_journal_entry_immutability
journal_lines   trg_journal_line_immutability   enforce_journal_line_immutability
```

`enforce_invoice_immutability` raises `check_violation` when any of
`subtotal · tax_rate · tax_amount · discount · total · currency · cgst_amount · sgst_amount ·
igst_amount · exchange_rate` changes on an invoice whose status is not `DRAFT`, with the message
*"issue a credit note for corrections"*. The application agrees:
`invoices-update.service.ts:102` refuses to edit a non-draft invoice at all. Two independent
lines of defence. **KEEP.**

**Open defect (P2):** the trigger's `check_violation` is not caught anywhere in
`src/modules/invoices/`. If the service guard is ever bypassed (a new caller, a bulk path), the
tenant gets a 500 rather than the trigger's actionable message. `common/db/postgres-error.ts`
already exports `isCheckViolation`; the invoice write/update paths should map it to a 409. Not
fixed — it needs a decision about which message to surface, and it is unreachable today.

---

## 4. Plans, entitlements, seats, proration, usage, tax/currency

Audited, no defect found; recorded as evidence rather than change:

* **Seats** — `billing/core/seat-definition.ts` exports `membersQuotaLockKey` / `lockMembersQuota`,
  the per-org advisory lock CLAUDE.md §5 requires around a membership insert. See §7 for a
  cross-territory finding about its adoption.
* **Proration** — `proration-ledger.service.ts` + `proration-math.ts`, specs green.
* **Entitlements** — `plan-limits.service.ts`; `pnpm check:module-entitlement` exit 0.
* **Provider neutrality** — `payments/dto/webhook.schemas.ts` is provider-neutral by construction;
  adapters parse their own envelope. `billing-webhook.spec.ts` already proves the same domain
  outcome under a substituted adapter.

### The Razorpay import boundary was structurally vacuous, and crashing

`src/modules/billing/payments/razorpay-service-import-boundary.spec.ts` guarded importers of
`../core/razorpay.service.ts`. **That file does not exist** — the service was replaced by
`payments/adapters/razorpay.adapter.ts`. The spec therefore matched nothing, its snapshot was `[]`,
and all four assertions passed trivially. It also walked the **repo root** (`__dirname/../../../../`)
including `node_modules`, and at head it **failed to run at all**:

```
ELOOP: too many symbolic links encountered, stat
'.../.claude/worktrees/bold-napier-7a4a41/node_modules/node_modules/…/@ably+msgpack-js@0.4.1/node_modules/bops'
```

Rewritten to scan `src/` only (skipping `node_modules`, `.git`, `dist`, `coverage`, `.next`), to
target `razorpay.adapter`, to allow the composition root (`payments.module.ts`) and the adapters
directory, and to assert the population is real (`allFiles.length > 2000`) so an empty violator list
means something. Snapshot updated to the two genuine importers.

```
pnpm exec jest --runInBand --testPathPattern="razorpay-service-import-boundary"   EXIT=0   6 passed
```

**Bite test:** adding `import { RazorpayAdapter }` to `billing/core/billing.service.ts` →
`BITE EXIT=1, Tests: 3 failed, 3 passed`. Source restored.

---

## 5. Commands run — literal, with the exit code observed

Exit codes captured directly (`cmd > log 2>&1; RC=$?`). `${PIPESTATUS[0]}` is empty in this zsh and
was not used.

| Command | Exit | Number produced |
|---|---|---|
| `pnpm -C streamlineos-backend typecheck` | **0** | — |
| `pnpm -C streamlineos-frontend/frontend type-check` | **0** | — |
| `jest --runInBand --testPathPattern="modules/(finance\|expenses\|accounting\|invoices\|quotes\|billing)/"` | **0** | 185 suites passed, 1 skipped; **1294 tests passed**, 2 skipped |
| `pnpm check:tenant-isolation` | **0** | 931/931 tenant-owned services have a declared test |
| `pnpm check:record-access` | **0** | 1192 findFirst, 591 record reads, 1 named skip |
| `pnpm check:scope-application` | **0** | 150 resolutions / 150 applied |
| `pnpm check:module-entitlement` | **0** | — |
| `pnpm check:cache-invalidation` | **0** | 187 write sites / 475 invalidate sites |
| `pnpm check:idempotent-commands` | **0** | 546 controllers, 11 handlers in scope, 11 named skips |
| `pnpm check:outbox-consumers` | **0** | 24 emitted / 29 declared / 29 registered event types |
| `pnpm check:n1-growing-loops` | **0** | 97 growing sites vs ratchet 102 |
| `pnpm check:query-projections` | **0** | 1378 unprojected vs ceiling 1383 |
| `pnpm check:unbounded-reads` | **0** | 3 actionable unbounded (target 0), 0 offset |
| `pnpm check:transaction-callbacks` | **0** | 473 doubles, 266 invoke, VOID 2 (ratchet 2) |
| `pnpm check:restrict-fks` | **0** | — |
| `pnpm check:migration-discipline` | **0** | 672 SQL files, 0 new violations |
| `pnpm check:log-secrets` | **0** | 3640 files, 101 TIERS entries |
| `pnpm check:retention-coverage` | **0** | — |
| `pnpm check:authz-deny` | **0** | uncovered 2311 vs ratchet 2441 |
| `pnpm check:ai-charge` | **0** | 124 invocations, all declare `charge` |
| `SET_NULL_GATE_DATABASE_URL=<scratch_perf_seed> check:set-null-column-lists` | **0** | 562 declared / 274 needing a list / 802 catalog constraints — **catalog half matched** |
| frontend `check:query-scope` · `gated-reads` · `response-contracts` · `empty-states` · `named-handlers` · `permission-binding` · `permission-catalog` · `contract-drift` · `file-sizes` | **0** each | — |

**Gates that do NOT pass, and whose cause is not mine:**

* `pnpm check:replay-ledger` — **EXIT 2** bare (`COLD_DATABASE_URL is required`); **EXIT 1** when
  pointed at `scratch_perf_seed`, reporting *"Journal entries 672 · Applied (in `__replay`) 0 · Not
  applied 672"*. `scratch_perf_seed` was bootstrapped by `db-bootstrap.mjs`, which does not populate
  the `__replay` ledger this gate reads. It needs a purpose-built cold-replay database.
  **Infrastructure, not billing.**
* `pnpm check:spec-typecheck` — **EXIT 2**, two errors, both in
  `src/test/narrowed-type-assertions.spec.ts:249,265` (`Type '"closed"' is not assignable to
  '"open" | "resolved" | "in_review"'`). Support-ticket status union; **another territory.**
* `pnpm check:set-null-column-lists` **without** a database — EXIT 2 `INCONCLUSIVE`. It passes when
  given one; the bare invocation is a missing-env condition, not a failure.

---

## 6. Classification of my billing/payments folders

| Path | Verdict | Reason |
|---|---|---|
| `src/modules/billing/core/**` | **KEEP** | 71 source files, all reachable from `AppModule`; webhook/ledger/proration/seat logic is the live path |
| `src/modules/billing/payments/**` | **KEEP** | provider-neutral adapter seam; all modules registered |
| `billing/core/revenue-analytics.service.ts` | **REFACTORED** | prevents a second `revenue_events` row for one provider event (§1) |
| `billing/payments/razorpay-service-import-boundary.spec.ts` | **REFACTORED** | prevented: a boundary gate that cannot run and, when it ran, could never fail (§4) |
| `billing/payments/testing/fake-provider-adapter.ts` | **KEEP** | knip-without-specs calls it unused; 8 specs import it and `src/scripts/assertion-ceiling-ledger.json:328` names it by path |
| `db/schema/billing/invoice-snapshot.ts` → `billing_invoice_number_sequences` | **AMBIGUOUS** | 0 runtime consumers, 0 spec references. Declared-but-unused. Not proven dead; do not delete on this evidence |
| **REMOVE candidates** | **none** | every `@Module` under `billing/` is reachable from `AppModule` |

---

## 7. Cross-territory findings (report only — not edited)

1. **`lockMembersQuota` is bypassed at five of six membership-insert sites.**
   `billing/core/seat-definition.ts` is the canonical helper CLAUDE.md §5 mandates. Only
   `billing/core/seat-ledger.service.ts:63` calls it. These five inline the raw advisory-lock SQL
   instead: `organization/core/invitation-acceptance.service.ts:101`,
   `organization/core/invitation-create.service.ts:253`, `users/users.service.ts:128` and `:176`,
   `hr/directory/employee-onboarding.service.ts:100`. The fix is adoption, not deletion. **P2.**
2. **`check:spec-typecheck` is red on `src/test/narrowed-type-assertions.spec.ts:249,265`** (§5).
3. **`knip` as configured cannot report dead code in this repo.** `knip.json` lists
   `src/**/*.spec.ts` as entry points and the jest plugin re-adds them even if removed, so anything
   a spec imports is "used". A control run with `"jest": false` moved unused files from **0 → 48**.
   Anyone citing a green knip run as evidence of no dead code is citing a gate that cannot fail that
   way. **P2, tooling.**
4. **Frontend catalog drift:** `accounting:access:view` / `accounting:access:manage` exist at
   `lib/rbac/permissions/permission-key-extended.ts:142-143` and **nowhere in the backend catalog**.
   They gate `app/(authenticated)/accounting/access/page.tsx:5` and
   `components/layout/sidebar/sidebar-nav-groups-finance.ts:382`, so that route and nav entry are
   permanently denied to everyone but the org owner. **P1, belongs to whoever owns the catalogs.**

---

## 8. Frontend — states, gating, money (ticket 10 half)

`/settings/billing` and `/settings/billing/ai-credits` are the only platform-billing routes present;
`/billing`, `/billing/ai-credits`, `/settings/subscription`, `/billing/seats` are **absent** —
the shared-CLAUDE §8 deletion holds and nothing has been resurrected. `/billing/invoices/**` is the
org's own customer invoicing and is legitimate.

### Fixed — `features/payments/**` write controls were ungated

`features/accounting/settings/payment-providers-page.tsx:23` gates the whole page on
`payments:providers:view`, a **read** key, and nothing below it consulted `useCan`. Holders of that
read key were rendered a live gateway-credential form, a Disconnect button, a webhook-secret rotate
button and **"Activate live payments"**. `useAuthorizedMutation` fails closed *after the click*, so
this was a UX and disclosure defect rather than a privilege escalation — but frontend/CLAUDE.md §17
requires the control be hidden.

Every key below was verified present in **both** `frontend/lib/rbac/permissions/` and
`backend/src/modules/rbac/permissions/payments.ts`.

| File | Control now gated on |
|---|---|
| `features/payments/components/credentials-tab.tsx:40,101,122` | `payments:credentials:manage` — hides Disconnect **and** the three secret inputs + Save |
| `features/payments/components/live-activation-panel.tsx:27,32` | `payments:live:activate` |
| `features/payments/components/webhooks-tab.tsx:84,108,129` | `payments:webhooks:manage` — Generate/Regenerate and the per-row Retry |
| `features/payments/components/test-payment-tab.tsx:35,115` | `payments:test:run` |
| `features/payments/components/manual-methods-panel.tsx:31,140,145` | `payments:manual-methods:manage` — Save and Disable |
| `features/payments/components/provider-card.tsx:27,69` | `payments:providers:manage` — Connect |

### Fixed — invoice line items were structurally unreachable (was P0)

`GET /invoices/:invoiceId` never joined `invoice_items`, though the relation
(`db/schema/crm/invoicing.ts:247`) has always existed. The frontend contract documented the absence
as intended (`hooks/api/invoice-schema.ts:71-77`) and defaulted the array to `[]`. Consequences:

* the Line Items table on `/billing/invoices/[invoiceId]` was permanently empty;
* **every downloaded invoice PDF had a total and no itemisation**
  (`features/billing/invoice-detail-pdf.ts:35` iterates an always-empty array);
* the Edit dialog seeded from `[]`, refused to save with zero items, and a user adding a placeholder
  row to get past that guard would replace the invoice's real rows.

Fixed at the root. `InvoicesService.getInvoice` (`src/modules/invoices/invoices.service.ts`) now
joins `items` with an **explicit column projection**, orders by `(lineOrder, id)`, and returns them
as `lineItems` — the name the client already reads. Amounts stay **decimal strings**, matching
`subtotal`/`total` on the same record rather than degrading money to a JS double.

Client updated to match: `invoiceItemContract` (`hooks/api/invoice-schema.ts:37`) now contracts the
persisted row (`id`, `description`, `hsnSacCode`, `quantity`, `rate`, `gstRate`, `amount`,
`lineOrder`, all decimals as strings); the write input is decoupled into `LegacyLineItemInput`
(`hooks/api/invoice.ts:33`) because the backend's `createInvoiceSchema` takes numbers. The two stale
comments asserting the field is unreachable were corrected.

**The frontend typecheck caught the contract change at a real consumer** —
`features/accounting/sales/invoice-detail-view.tsx:99,110` passed the string straight into `<Money
value: number>`. Converted at the display boundary (`Number(...)`), as CLAUDE.md §6 prescribes, at
those two sites plus the quantity cells in that file and `features/billing/invoice-line-items.tsx:67`
(which would otherwise have rendered `1.0000`).

Proof: `src/modules/invoices/invoice-line-items-wire-shape.spec.ts` (new, 8 cases) drives the real
service against a double answering **in the shape the driver produces** (decimals as strings) and
asserts what the read path returns — the AGENT-BRIEF rule-11 model. It pins the contracted name, the
explicit projection, the delegated ordering, string-typed amounts, `[]` rather than `undefined`, that
the raw relation name does not leak, and that another tenant's id stays a miss.

```
pnpm exec jest --runInBand --testPathPattern="invoice-line-items-wire-shape"   EXIT=0   8 passed
```

**Not measurable on the seed:** `invoice_items` holds **0 rows** across all 25 seeded invoices, so
the added read could not be cost-measured — a plan over an empty relation is not representative.
The supporting index exists (`idx_invoice_items_invoice ON (invoice_id)`) and the predicate matches
it. The emptiness independently corroborates the defect: nothing on this database would ever have
surfaced the empty-PDF bug. **Re-measure once the seeder writes line items.**

### Open frontend defects in ticket-10 scope — reported, not fixed

| Sev | File:line | Defect |
|---|---|---|
| P1 | `features/billing/invoices-client.tsx:99,104,109,270,326`; `invoice-detail-actions.tsx:40,45,50,55,60`; `record-payment-dialog.tsx:240`; `new-invoice/new-invoice-form.tsx:44`; `components/plan-card.tsx:103` | mutating controls render ungated (`accounting:create|update|manage`, `billing:subscription:manage`) |
| P1 | `features/billing/invoices-client.tsx:109`, `invoice-detail-actions.tsx:60` | **Void has no `ConfirmDialog`** — frontend/CLAUDE.md §13 hard rule for a destructive action |
| P1 | `features/billing/new-invoice/new-invoice-form.tsx:48-66`, `new-invoice-schema.ts:54-63` | client recomputes subtotal/CGST/SGST/IGST/total in floats and displays them, while the backend recomputes independently — the displayed total is not the saved total |
| P1 | `features/billing/invoice-detail-content.tsx:68-69` | Credit Notes and Refund History panels are **hardcoded text**; they read no data and always report none |
| P2 | `features/billing/invoice-line-items.tsx:145,155,219-221` | unrounded float math (`qty*rate`, `reduce(+)`, `sub*(rate/100)`) in the edit dialog |
| P2 | `features/payments/components/readiness-rail.tsx:18`, `live-activation-panel.tsx:30`, `plan-usage-meters.tsx:93`, `test-payment-tab.tsx:150`, `audit-tab.tsx:20`, `webhooks-tab.tsx:87` | a denied or failed read renders as a permanent skeleton, as nothing, or as an empty state. `hooks/api/gated-query.ts:16-25` documents this trap and ships the `access` half; no screen in scope consumes it |
| P2 | `features/billing/invoice-detail-utils.ts:42`, `invoice-line-items.tsx:26` (receives `currency` as a prop at `:101` and ignores it), `record-payment-dialog.tsx:44`, `new-invoice-schema.ts:66`, `components/ai-credit-pack-card.tsx:54`, `components/plan-card.tsx:86,91` | hardcoded `₹` where the record carries a `currency` field |
| P2 | `app/(authenticated)/billing/invoices/new/page.tsx` | no route-level permission check; only the parent layout's `/billing/invoices` **read** gate applies |
| P3 | `features/billing/invoice-line-items.tsx:85-87` | `getRowKey` returns the array index (CLAUDE.md §3 forbids it); same file's `DataTable` at `:229` passes no `pagination` |
