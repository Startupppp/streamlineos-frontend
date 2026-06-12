# Pass 21 — Vendor payments (closes the AP payment loop)

## TL;DR

Vendor payments now work end-to-end: new `vendor_payments` table + migration, posting helper, POST route with status transitions, hook, and a `Record payment` dialog on the bill detail page. `purchase_bills.amountPaid` finally gets populated, which lights up Aged Payables and Vendor Ledger reports with real data. `tsc` clean; smoke 5/5 PASS.

---

## What ships

### Schema

**Modified — `lib/db/schema/crm.ts`:**
- New `vendor_payments` table — mirrors `payments` but FK to `purchase_bills`
- Relations to `organizations`, `purchase_bills`, `users`

**Created — `drizzle/0107_vendor_payments.sql`** — hand-written migration.

### Posting helper

**Created — `lib/accounting/post-vendor-payment.ts`:**
- `postVendorPayment(input, tx?)` — Debits AP (2000), Credits Cash (1000) or Bank (1100) based on payment method
- `sourceType: "vendor_payment"`, `sourceEvent: "payment"` for idempotency
- Forwards `tx` for atomicity

### API

**Created — `app/api/accounting/purchase-bills/[billId]/payments/route.ts`:**
- `GET` — lists payment history for a bill (read access)
- `POST` — RBAC `accounting:manage`; validates:
  - Bill must be POSTED, PARTIALLY_PAID, or PAID (rejects DRAFT/CANCELLED with 409)
  - Payment amount ≤ remaining outstanding (rejects overpayment with 400)
  - Single `db.transaction` wraps: insert payment row, recompute `amountPaid` via SQL sum, update bill status (PARTIALLY_PAID / PAID based on threshold), post journal entry
- Invalidates 7 cache tags after commit: `purchaseBills`, `journal`, `trialBalance`, `profitLoss`, `balanceSheet`, `vendorLedger`, `agedPayables`

Status transition logic:
- After insert, sum all payments for the bill
- If `paidSum >= total − 0.005` → `PAID`
- Else → `PARTIALLY_PAID`

### Hook

**Modified — `lib/api/hooks/accounting.ts`:**
- `useRecordVendorPayment(billId)` mutation

### Dialog component

**Created — `features/accounting/record-vendor-payment-dialog.tsx`:**
- Uses `EntityFormDialog` (small form pattern)
- Fields: amount (defaults to remaining outstanding), payment date (defaults to today), payment method (6 options), reference number, notes
- zod schema uses string-typed `amount` with refinement (avoids `z.coerce.number()` input/output type mismatch that conflicts with the resolver typing)
- Submit payload converts to number; sonner success/error toasts

### Bill detail page

**Modified — `app/(dashboard)/accounting/purchase-bills/[billId]/page.tsx`:**
- New "Record payment" button visible only when status is POSTED or PARTIALLY_PAID and outstanding > 0
- Dialog renders below the totals card; opens via named `handleOpenPaymentDialog`

---

## Atomicity

The vendor-payment flow is fully atomic via `db.transaction`:
1. Insert `vendor_payments` row
2. Recompute `purchase_bills.amountPaid` from SQL sum of all payments for the bill
3. Update `purchase_bills.status` based on the threshold
4. Call `postVendorPayment(..., tx)` to write the journal entry

If any step fails the whole flow rolls back. The journal entry's idempotency UNIQUE on `(orgId, "vendor_payment", paymentId, "payment")` prevents double-posting on retry.

---

## Cache invalidation

After commit, 7 tags are invalidated:
- `purchaseBills` — bill status/amountPaid changed
- `journal` — new entry
- `trialBalance`, `profitLoss`, `balanceSheet` — GL movement
- `vendorLedger` — vendor's outstanding changed
- `agedPayables` — buckets shift

---

## Code-quality discipline maintained

- Zero comments
- Zero `as` type casts (resolved the zod amount input/output mismatch by typing the form field as string and parsing in submit, NOT via cast)
- Zero `!`, `any`, `ts-ignore`
- All event handlers named
- `tsc --noEmit` clean for accounting paths
- Smoke 5/5 PASS

---

## What's now fully working (cumulative since Pass 13)

| Capability | Status |
|---|---|
| AR side: Invoice + payment + auto-post | ✅ |
| AP side: Bill + payment + auto-post | ✅ (this pass) |
| Customer ledger with outstanding | ✅ |
| Vendor ledger with outstanding | ✅ (data now flows after this pass) |
| Aged Receivables | ✅ |
| Aged Payables | ✅ (data now flows after this pass) |
| Trial Balance, P&L, Balance Sheet | ✅ |
| GSTR-1, GSTR-3B | ✅ |
| Manual journal entries + DRAFT/POSTED | ✅ |
| Reverse entries | ✅ |
| All atomic via `db.transaction` + `persistJournalEntry(tx)` | ✅ |

The Accounting MVP is functionally complete for the Indian SMB use case.

---

## Pass 22 candidates

- **TDS deductions** — sections 194C, 194J, 194I; deducted at vendor-payment time; `tds_deductions` table; modify `postVendorPayment` to split TDS portion to `TDS Payable` (2200) — most natural next pass
- **Bank reconciliation** — match bank statement entries against payments + matching UI
- **Year-end closing** — close revenue/expense to retained earnings via batch journal
- **Multi-currency** — currency tables, FX rates, monthly revaluation
- **GSTR-2B reconciliation** — match purchase bills against vendor-uploaded GSTR-1 data

Then: Inventory (Odoo's next big module).

---

## Verification

```bash
pnpm exec tsc --noEmit                                           # clean for accounting
pnpm exec tsx --env-file=.env scripts/test-accounting.ts         # 5/5 PASS
```

Pre-existing TS errors (unchanged): `lib/rbac/require-permission.ts`, `lib/api/hooks/blog.ts`, `app/(dashboard)/projects/[projectId]/settings/page.tsx`, `app/api/hr/performance/cycles/[cycleId]/route.ts`.
