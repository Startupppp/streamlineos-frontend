# Pass 14 — Accounting Session 2 Part A

## TL;DR

Three high-leverage follow-ups to Pass 13:
1. **Closed the atomicity gap** — `persistJournalEntry`, `postInvoiceSend`, `postPaymentReceipt`, and `nextEntryNumber` all accept an optional Drizzle transaction handle. All three modified routes now post the journal entry INSIDE the same `db.transaction` as the invoice/payment write. A posting failure rolls back the originating row.
2. **First-class accounting permissions** — Added `accounting:view`, `accounting:manage`, `accounting:report` to the RBAC catalog with sensible role defaults. Sidebar Accounting group now gates on `accounting:view` instead of the HR-salary-permission hack.
3. **Customer ledger feature** — `clients.state` column + migration `drizzle/0105_clients_state.sql`; API for outstanding-receivables list and per-customer ledger with running balance against the AR account; two new pages under `/accounting/customers/`; nav card added to the Accounting hub.

`pnpm exec tsc --noEmit` clean throughout. Nothing committed.

---

## Files touched

### Pass 14 Task 1 — Atomicity fix
**Modified:**
- `lib/accounting/persist-entry.ts` — `DbOrTx` type alias derived from `typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]`; optional `tx` param; `executor = tx ?? db` pattern throughout
- `lib/accounting/numbering.ts` — `nextEntryNumber(orgId, year, tx?)`
- `lib/accounting/post-invoice.ts` — `postInvoiceSend(input, tx?)` forwards `tx`
- `lib/accounting/post-payment.ts` — `postPaymentReceipt(input, tx?)` forwards `tx`
- `server/queries/invoice.ts` — `createPayment` accepts optional `tx`
- `app/api/invoices/route.ts` — `postInvoiceSend` moved inside the existing `db.transaction`
- `app/api/invoices/[invoiceId]/route.ts` — wrapped status update + post in a new `db.transaction`
- `app/api/invoices/[invoiceId]/payments/route.ts` — wrapped `createPayment` + `postPaymentReceipt` in a single transaction, both receive the same `tx`

Cache `revalidateTag(...)` calls now strictly follow transaction commit (correct order — don't bust caches until durable).

`seedChartOfAccountsForOrg` kept OUTSIDE the transaction in all three routes — idempotent upsert; subsequent in-tx posting needs CoA rows committed.

### Pass 14 Task 2 — Accounting permissions
**Modified:**
- `lib/rbac/permissions.ts` — added 3 entries:
  - `accounting:view` — read CoA, journal, reports
  - `accounting:manage` — create/edit accounts, post manual JEs
  - `accounting:report` — generate TB, P&L, etc.
  - HR role granted `accounting:view` + `accounting:report` (read-only finance)
  - OWNER/CEO inherit via the dynamic `ALL_PERMISSIONS = PERMISSIONS.map(p => p.name)` constant
- `components/layout/sidebar/sidebar-nav-items.ts` — Accounting `NavGroup.requiredPermission` switched from `["hr:salary:manage", "hr:payroll:approve"]` to `["accounting:view"]`

Non-regression spot-check confirmed: SALES, CUSTOMER_SUPPORT, ENGINEERING, DESIGN, VIDEO_EDITOR, DIGITAL_MARKETING, BLOG_EDITOR, BRANCH_MANAGER, BRANCH_HR — none accidentally got `accounting:*`.

### Pass 14 Task 3 — Customer ledger
**Created:**
- `drizzle/0105_clients_state.sql` — `ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "state" text;`
- `app/api/accounting/customers/route.ts` — outstanding-receivables list with optional `onlyOutstanding`, search, pagination
- `app/api/accounting/customers/[clientId]/ledger/route.ts` — per-customer ledger with running balance against AR
- `app/(dashboard)/accounting/customers/page.tsx` — customer ledgers list
- `app/(dashboard)/accounting/customers/[clientId]/page.tsx` — single-customer ledger view

**Modified:**
- `lib/db/schema/crm.ts` — `clients.state` column added (text, nullable)
- `lib/api/cache-tags.ts` — `customerLedger: "customer-ledger"`
- `types/accounting.ts` — `CustomerLedger`, `CustomerLedgerLine`, `CustomerLedgerSummary`, `CustomerOutstanding`
- `lib/validation/accounting-schemas.ts` — `listCustomerLedgerQuerySchema`, `listCustomersOutstandingQuerySchema`
- `lib/query-keys.ts` — `accounting.customersOutstanding`, `accounting.customerLedger`
- `lib/api/hooks/accounting.ts` — `useCustomersOutstanding(params)`, `useCustomerLedger(clientId, params)`
- `app/(dashboard)/accounting/page.tsx` — secondary nav row with "Customer ledgers" card

### Running-balance query strategy

1. Look up AR account id by code `1200` for the org
2. Collect this client's invoice IDs, then collect payments-for-those-invoices IDs
3. Query `journal_lines INNER JOIN journal_entries` filtered to `account_id = AR`, `status = "POSTED"`, and `(sourceType="invoice" AND sourceId IN invoiceIds) OR (sourceType="payment" AND sourceId IN paymentIds)` — `source_id` is `text`, so IDs are stringified for `inArray`
4. Order by `entry_date ASC, id ASC, line_order ASC`
5. Single pass over rows: `running += debit - credit` (AR is debit-normal)
6. Each line carries `invoiceId` + `invoiceNumber` resolved via two pre-fetched maps (invoice→number, payment→invoiceId)

Caching: list uses `orgScopedTag(CacheTag.customerLedger, orgId)`; detail uses `entityScopedTag(CacheTag.customerLedger, "${orgId}:${clientId}")` plus the org-scoped tag. A single `revalidateTag` on the org-scoped tag busts both.

---

## Code-quality discipline

Across all 3 tasks (same as Pass 13):
- Zero comments
- Zero type casts (`as X` / `as unknown as Y`)
- Zero `!` non-null assertions
- Zero `any` / `ts-ignore`
- All event handlers named
- Strict TS clean (`pnpm exec tsc --noEmit` exits 0)

---

## Discovered context

The existing accounting API routes (from Pass 13) use `withModuleAbility("accounting", "read", ...)` — a CASL-style ability check tied to the broader CASL/plan-gate scaffold from Pass 6. The customer ledger routes adopted this same pattern (`withModuleAbility("accounting", "read", "accounting:reports", ...)`) for consistency. The new `accounting:*` permissions in `lib/rbac/permissions.ts` complement that ability layer for the per-permission gates the sidebar and routes use.

The Accounting layout segment at `app/(dashboard)/accounting/layout.tsx` is still role-based (OWNER/CEO/HR + platform-owner bypass) rather than permission-based, because the available `checkPermission` helper is async and db-bound (needs userId+orgId). Role-based at the layout + permission-based at the sidebar produce the same effective set, so this is fine for now.

---

## Verification

```bash
pnpm exec tsc --noEmit                                           # clean
pnpm exec tsx --env-file=.env scripts/test-accounting.ts         # 5/5 PASS (unchanged from Pass 13)
```

---

## Remaining Accounting Session 2 work (Pass 15 candidates)

- **GSTR-1 read-only summary** — outward supplies grouped by tax rate and place of supply; export-ready
- **Reversing entry endpoint** — invoice/payment void → reversing JE
- **TDS deduction** — sections 194C, 194J, 194I; deducted at payment; new `tds_deductions` table
- **Purchase bills** — vendors (or `clients.isVendor` flag) + `purchase_bills` schema + UI + posting helper (AP DR + Expense CR + Input GST DR)
- **Aged receivables / payables** — bucket clients/vendors by 0–30 / 31–60 / 61–90 / 90+ days
- **Manual journal entry UI** — DRAFT → POSTED workflow; uses `accounting:manage` permission
- **Vendor ledger** — mirrors customer ledger; needs vendor model first
- **First-class `accounting:manage` integration** — currently routes use `withModuleAbility`; tighten to `accounting:manage` for create/update endpoints

After Session 2, next Odoo apps in priority order: Inventory → Purchase → Manufacturing → POS → eCommerce → Marketing Automation → Helpdesk → Documents.
