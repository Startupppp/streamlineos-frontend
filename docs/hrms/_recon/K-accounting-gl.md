# Lane K — Accounting / GL Audit (Read-Only)

**Scope:** `src/modules/accounting/**` (53 ts) · `src/modules/finance/**` (118 ts) · `src/modules/invoices/**` (13 ts) · `src/db/schema/accounting/**`

**Auditor note — System Boundary:** This lane owns the **org's own accounting** — its general ledger, its invoices to its customers, payroll→GL posting, and FX. **Platform billing** (StreamlineOS charging the customer org) lives in `src/modules/billing/` and is explicitly out of scope. The two systems meet at exactly one seam: `PlanLimitsService.assertWithinLimit(orgId, "acctInvoices")` called in `invoices-write.service.ts:46` — the billing module gates how many org-customer invoices the org may create, then control returns entirely to the accounting layer.

---

## 1. Payroll → GL Posting Path (end-to-end)

### Trigger
A finalized payroll run calls `PayrollPostingService.postFinalized(u, runId, month, gross, deductions, net, employerCost)` in `modules/payroll/payroll-posting.service.ts`.

### Trace

| Step | File:Line | Detail |
|------|-----------|--------|
| Receive amounts as strings | `payroll-posting.service.ts:20-25` | `gross`, `deductions`, `net`, `employerCost` arrive as `string` |
| **parseFloat** conversion | `payroll-posting.service.ts:22-25` | `grossNum = parseFloat(gross ?? "0")` etc — **JS float conversion** |
| **Float addition** | `payroll-posting.service.ts:28` | `totalExpense = (grossNum + employerCostNum).toFixed(4)` — **float arithmetic on money** |
| Build string amounts | `payroll-posting.service.ts:29-31` | `netStr`, `taxStr`, `employerStr` via `.toFixed(4)` |
| Period gate | `finance-posting.service.ts:117-138` | `assertPeriodOpen(orgId, entryDate)` — throws on CLOSED/LOCKED period |
| Idempotency check | `finance-posting.service.ts:270-284` | `SELECT WHERE orgId + sourceType + sourceId + sourceEvent` (unique index `uniq_je_idempotency` on `accounting.ts:61`) — returns existing entry if already posted |
| Balance assertion | `money.util.ts:70-82` | `assertDebitsEqualsCredits()` — **BigInt arithmetic**, throws `Error` if Σdebit ≠ Σcredit |
| DB transaction | `finance-posting.service.ts:269-397` | All inserts within `db.transaction()` |
| Journal entry insert | `finance-posting.service.ts:319-335` | `INSERT INTO journal_entries ...` with `status = "POSTED"` |
| Journal lines insert | `finance-posting.service.ts:339-372` | `INSERT INTO journal_lines ...` |
| **Error swallowed** | `payroll-posting.service.ts:33/62` | `try { await this.posting.postJournal(...) } catch (err) { this.logger.error(...) }` — **posting failure is logged only, never propagated to the caller** |

### Double-Entry Structure

**On finalize (accrual):**
```
DR  SALARY_EXPENSE    (gross + employerCost)
  CR  PAYROLL_PAYABLE      (net)
  CR  TAX_PAYABLE          (deductions)
  CR  EXPENSE_CLEARING     (employerCost)
```
Balanced when `gross = net + deductions` (payroll run invariant). If payroll rounding breaks this, `assertDebitsEqualsCredits()` throws but the error is swallowed — **the payroll run is marked finalized but no GL entry exists.**

**On payment disbursement:**
```
DR  PAYROLL_PAYABLE   (net)
  CR  BANK_CLEARING       (net)
```
Balanced by construction (single amount, same value on both sides).

### Is it double-entry and balanced? Yes, structurally. Is it transactional? Yes. Is it idempotent? Yes (unique constraint). What happens on failure? **The error is caught and logged; the payroll run proceeds without a GL entry** — silent data loss.

---

## 2. Money Representation

### DB Schema — `decimal` everywhere

| Table | Column(s) | Type | Notes |
|-------|-----------|------|-------|
| `journal_lines` | `debit`, `credit`, `base_debit`, `base_credit` | `decimal(18,4)` | GL amounts |
| `journal_lines` | `exchange_rate` | `decimal(18,8)` | FX rate |
| `invoices` | `subtotal`, `tax_amount`, `discount`, `total`, `cgst_amount`, `sgst_amount`, `igst_amount`, `amount_paid` | `decimal(18,4)` | Org invoices |
| `invoices` | `tax_rate` | `decimal(5,2)` | Rate only |
| `invoices` | `exchange_rate` | `decimal(18,8)` | |
| `payments` | `amount` | `decimal(12,2)` | **Scale 2 only — mismatches journal_lines scale 4** |
| `purchase_bills` | all monetary | `decimal(18,4)` | |
| `credit_notes` | all monetary | `decimal(18,4)` | |
| `fin_exchange_rates` | `rate` | `decimal(18,8)` | |

**Drizzle returns `decimal` columns as JS strings.** Any `Number(value)` call at the service layer converts to JS float.

### Two Distinct Arithmetic Paths

**Path A — `JournalPostingService` (used by invoice/bill GL posting):**
- `DraftLine.debit` and `DraftLine.credit` are typed `number` (JS float): `journal-posting.service.ts:16-17`
- `assertBalanced()` uses `lines.reduce((acc, l) => acc + l.debit, 0)`: `journal-posting.service.ts:189` — **pure float accumulation**
- Balance tolerance: `diff > 0.009` — **allows ±0.008 imbalance**
- Written to DB via `line.debit.toFixed(4)`: `journal-posting.service.ts:271`
- `round2 = (n: number) => Math.round(n * 100) / 100`: `invoice-helpers.ts:8`, `posting-rules.ts:24`
- `subtotal = round2(items.reduce((acc, it) => acc + it.amount, 0))`: `invoices-write.service.ts:66-68` — **float accumulation on line totals**
- `taxPool = round2(items.reduce((acc, it) => acc + it.tax, 0))`: `invoices-write.service.ts:69-71`
- `total = round2(subtotal + taxPool - discount)`: `invoices-write.service.ts:73`
- All amounts stay as floats through the invoice creation until `toFixed(4)` at DB insert

**Path B — `FinancePostingService` (used by payroll, manual journal API, reversal):**
- `money.util.ts` uses `BigInt` internally: `money.util.ts:1-82` — **correct, no float precision loss**
- `assertDebitsEqualsCredits()`: `money.util.ts:70-82` — BigInt exact comparison, no tolerance
- BUT `payroll-posting.service.ts:22-28` uses `parseFloat()` + float addition BEFORE calling Path B — float contamination enters at the boundary

### Float Arithmetic Lines (complete list in scope)
- `payroll-posting.service.ts:22-28` — `parseFloat(gross)`, `parseFloat(deductions)`, `parseFloat(net)`, `parseFloat(employerCost)`, `(grossNum + employerCostNum).toFixed(4)`
- `invoices-write.service.ts:61-73` — all line amount/tax computation via `round2()` (float)
- `invoices-update.service.ts:49-55` — `Number(existing.subtotal)`, `Number(existing.discount)`, float arithmetic for willPost path
- `journal-posting.service.ts:188-203` — `assertBalanced` float accumulation
- `accounting-gst.service.ts:131-134, 272-275` — `Number(l.amount)` float accumulation across invoices (GSTR-1/3B reports)
- `invoices-lifecycle.service.ts:26-27, 37-38, 41` — `::float` SQL cast, `Number(invoice.total)`, float comparison `>= invTotal - 0.005`
- `invoices-payment.service.ts:77-82` — `::float` SQL cast, `Number(invoice.total)`, float subtraction for `remaining`
- `general-ledger.service.ts:9-11, 41-43, 129-132` — `parseDecimal()` via `Number(v)`, running balance via float addition
- `reconciliation.service.ts:160, 223, 229, 252-253, 356` — `parseFloat(txn.amount)`

### Currency Code
Every monetary table has a `currency text` column. Every journal entry has `currency text`. All OK.

---

## 3. Double-Entry Integrity

### Service-Level

| Path | Assertion | Method | Tolerance |
|------|-----------|--------|-----------|
| `FinancePostingService.postJournal()` | `assertDebitsEqualsCredits()` at `finance-posting.service.ts:256` | BigInt exact | **zero** |
| `JournalPostingService.assertBalanced()` at `journal-posting.service.ts:188` | float reduce | `diff > 0.009` — **allows real imbalance** |
| `AccountingLedgerService.createJournalEntry()` at `accounting-ledger.service.ts:132-138` | float reduce | `> 0.009` — same tolerance |

### DB-Level
**No database-level CHECK constraint, trigger, or deferrable constraint enforcing Σdebit = Σcredit per journal entry.** The balance guarantee is service-layer only. A bug bypassing `assertBalanced()` or a direct DB write silently produces an unbalanced ledger.

---

## 4. Invoice Numbering

### Mechanism (`invoices-write.service.ts:94-104`)
```ts
await tx.execute(
  sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || 'invoice'))`,
);
const countRows = await tx.select({ count: sql<number>`count(*)::int` })
  .from(invoices).where(eq(invoices.orgId, orgId));
const nextNum = (countRows[0]?.count ?? 0) + 1;
const invoiceNumber = `INV-${new Date().getFullYear()}-${String(nextNum).padStart(4, "0")}`;
```

**Race-safety:** `pg_advisory_xact_lock` is transaction-level — serializes all invoice creation per org within the DB. Race-safe as long as all creation goes through this path. ✓

**Sequential within org:** Yes, within a single DB transaction. ✓

**Per legal entity:** No concept of legal entity — per org only. ✓ for single-entity orgs, ✗ for multi-entity.

**GST compliance gap:** Uses total invoice count across ALL years as the sequence base. The year prefix `INV-2027-...` increments from the prior year's count, not from 1. Indian GST requires invoice numbers to restart per financial year. The 501st invoice in FY 2027-28 (if 500 exist from prior years) would be `INV-2027-0501`, not `INV-2027-0001`.

**Journal entry numbering (two competing implementations):**
1. `FinancePostingService` → `nextSequenceNumber()` at `finance-posting.service.ts:149-167`: uses `accNumberSequences` table with atomic `INSERT ... ON CONFLICT DO UPDATE nextNumber + 1` — **atomic, correct**
2. `JournalPostingService` → `nextEntryNumber()` at `journal-posting.service.ts:173-185`: uses `MAX(entry_number) + 1` with 5 retry attempts on unique constraint violation — **correct but sequential-retry based, not atomic**

---

## 5. Immutability & Corrections

### POSTED Journal Entries

**Can be VOIDED (correct path):**
- `FinancePostingService.reverseJournal()` at `finance-posting.service.ts:412-530` — swaps debit/credit, inserts reversal entry, then **UPDATEs original entry to `status = "VOID"`** (`finance-posting.service.ts:512`). Correct ✓
- Called by `InvoicesLifecycleService.voidInvoice()` at `invoices-lifecycle.service.ts:130`

**BUG — Manual reversal does NOT void the original:**
- `AccountingLedgerController POST /accounting/journal/:entryId/reverse` → `AccountingLedgerService.reverseJournalEntry()` at `accounting-ledger.service.ts:329-407`
- Creates a new reversing entry via `JournalPostingService.persistJournalEntry()` (line 382)
- **Does NOT update the original entry's status to VOID** — original stays `POSTED`
- Both original and reversal are `POSTED`, economically canceling but neither flagged as reversed
- No `reversedEntryId` linkage set on the original via this path

**Status transitions that can touch a POSTED entry (legitimate):**
- Approval flow: `JournalApprovalsService.approveJournal()` at `journal-approvals.service.ts:49` changes `PENDING_APPROVAL → POSTED` ✓
- Reversal (FinancePostingService path only): sets `POSTED → VOID` ✓

**Can a POSTED entry's lines be updated?** No direct UPDATE on `journal_lines` found in any service. Lines are insert-only. ✓

### Invoices
- `DRAFT`: fully editable, amounts recalculated (`invoices-update.service.ts:116-144`)
- `ISSUED`/`PAID`: only status transitions allowed; field edits throw `BadRequestException("Only draft invoices can be edited")` at line 116-117 ✓
- `VOIDED`: blocks further payment (`invoices-payment.service.ts:72-73`)
- No hard DELETE on issued/paid/voided invoices ✓
- Credit notes exist in schema (`credit_notes` table) but their GL posting path was not traced in this audit

---

## 6. Tax on Invoices

| Feature | Status | File:Line |
|---------|--------|-----------|
| GST rate per line | ✓ Exists | `invoicing.ts:68`, `invoice_items.gstRate decimal(5,2)` |
| CGST/SGST/IGST split | ✓ Computed + stored | `invoices-write.service.ts:77-81`, `posting-rules.ts:30-36` |
| Place of supply field | ✓ Exists | `invoicing.ts:32`, `invoices.placeOfSupply text` |
| Customer GSTIN | ✓ Exists | `invoicing.ts:33`, `invoices.customerGstin text` |
| Supplier GSTIN | ✓ Exists | `invoices-write.service.ts:125` |
| HSN/SAC per line | ✓ Exists (nullable) | `invoicing.ts:65`, not enforced |
| Reverse charge flag | ✓ Exists | `invoices-write.service.ts:130` |
| Tax-inclusive flag | ✓ Exists | `invoices-write.service.ts:131` |
| GSTR-1 report | ✓ Exists (B2B/B2C) | `accounting-gst.service.ts:90–212` |
| GSTR-3B report | ✓ Exists | `accounting-gst.service.ts:310–394` |
| B2CS (inter-state small value) | ✗ Missing | GSTR-1 classifies only B2B vs B2C by GSTIN presence — no B2CS bucket |
| e-Invoice (IRN/QR code/IRP submission) | `[UNVERIFIED]` | No `irn`, `qr_code`, `e_invoice` fields found in any schema file |
| e-Way bill | `[UNVERIFIED — likely absent]` | No fields found |
| TCS (Tax Collected at Source) | `[UNVERIFIED — likely absent]` | No fields found |
| Per-financial-year invoice numbering reset | ✗ Missing | See §4 |

---

## 7. Endpoint Table

### `src/modules/accounting/core/`

| Method | Path | File:Line | @RequirePermission | Guards | ModuleGuard? | Validation | Paginated? |
|--------|------|-----------|-------------------|--------|--------------|-----------|------------|
| GET | /accounting/accounts | `accounting-ledger.controller.ts:47` | `accounting:accounts:read` | JWT+Perm | ✗ (decorator only) | Zod query | ✓ |
| POST | /accounting/accounts | `accounting-ledger.controller.ts:57` | `accounting:accounts:create` | JWT+Perm | ✗ | Zod body | — |
| PATCH | /accounting/accounts/:accountId | `accounting-ledger.controller.ts:68` | `accounting:accounts:update` | JWT+Perm | ✗ | Zod body | — |
| GET | /accounting/journal | `accounting-ledger.controller.ts:79` | `accounting:journal:read` | JWT+Perm | ✗ | Zod query | ✓ |
| POST | /accounting/journal | `accounting-ledger.controller.ts:90` | `accounting:journal:manage` | JWT+Perm | ✗ | Zod body | — |
| GET | /accounting/journal/:entryId | `accounting-ledger.controller.ts:101` | `accounting:journal:read` | JWT+Perm | ✗ | ParseInt | — |
| POST | /accounting/journal/:entryId/post | `accounting-ledger.controller.ts:111` | `accounting:journal:manage` | JWT+Perm | ✗ | ParseInt | — |
| POST | /accounting/journal/:entryId/reverse | `accounting-ledger.controller.ts:122` | `accounting:journal:manage` | JWT+Perm | ✗ | ParseInt | — |
| GET | /accounting/reports/gstr-1 | `accounting-gst.controller.ts:23` | `accounting:reports:read` | JWT+Perm | ✗ | Zod query | ✗ (full scan) |
| GET | /accounting/reports/gstr-3b | `accounting-gst.controller.ts:33` | `accounting:reports:read` | JWT+Perm | ✗ | Zod query | ✗ (full scan) |
| GET | /accounting/reports/trial-balance | `accounting-statements.controller.ts:25` | `accounting:reports:read` | JWT+Perm | ✗ | Zod query | ✗ (full scan) |
| GET | /accounting/reports/profit-loss | `accounting-statements.controller.ts:35` | `accounting:reports:read` | JWT+Perm | ✗ | Zod query | ✗ (full scan) |
| GET | /accounting/reports/balance-sheet | `accounting-statements.controller.ts:45` | `accounting:reports:read` | JWT+Perm | ✗ | Zod query | ✗ (full scan) |
| GET | /accounting/reports/cash-flow | `accounting-statements.controller.ts:55` | `accounting:reports:read` | JWT+Perm | ✗ | Zod query | ✗ (full scan) |
| GET | /accounting/purchase-bills | `accounting-payables-receivables.controller.ts:51` | `accounting:journal:read` | JWT+Perm | ✗ | Zod query | ✓ |
| POST | /accounting/purchase-bills | `accounting-payables-receivables.controller.ts:62` | `accounting:journal:manage` | JWT+Perm | ✗ | Zod body | — |
| GET | /accounting/purchase-bills/:billId | `accounting-payables-receivables.controller.ts:73` | `accounting:journal:read` | JWT+Perm | ✗ | ParseInt | — |
| PATCH | /accounting/purchase-bills/:billId | `accounting-payables-receivables.controller.ts:83` | `accounting:journal:manage` | JWT+Perm | ✗ | Zod body | — |
| GET | /accounting/purchase-bills/:billId/payments | `accounting-payables-receivables.controller.ts:94` | `accounting:journal:read` | JWT+Perm | ✗ | ParseInt | ✗ |
| POST | /accounting/purchase-bills/:billId/payments | `accounting-payables-receivables.controller.ts:104` | `accounting:journal:manage` | JWT+Perm | ✗ | Zod body | — |
| GET | /accounting/vendors | `accounting-payables-receivables.controller.ts:116` | `accounting:reports:read` | JWT+Perm | ✗ | Zod query | ✓ |
| GET | /accounting/vendors/:vendorId/ledger | `accounting-payables-receivables.controller.ts:126` | `accounting:reports:read` | JWT+Perm | ✗ | ParseInt | ✗ |
| GET | /accounting/customers | `accounting-payables-receivables.controller.ts:136` | `accounting:reports:read` | JWT+Perm | ✗ | Zod query | ✓ |
| GET | /accounting/customers/:clientId/ledger | `accounting-payables-receivables.controller.ts:147` | `accounting:reports:read` | JWT+Perm | ✗ | ParseInt | ✗ |
| GET | /accounting/reports/aged-receivables | `accounting-payables-receivables.controller.ts:157` | `accounting:reports:read` | JWT+Perm | ✗ | Zod query | ✗ |
| GET | /accounting/reports/aged-payables | `accounting-payables-receivables.controller.ts:167` | `accounting:reports:read` | JWT+Perm | ✗ | Zod query | ✗ |

### `src/modules/accounting/gl/`

| Method | Path | File:Line | @RequirePermission | Guards | ModuleGuard? | Validation | Paginated? |
|--------|------|-----------|-------------------|--------|--------------|-----------|------------|
| GET | /accounting/general-ledger | `general-ledger.controller.ts:24` | `accounting:general-ledger:read` | JWT+Perm | ✗ | Zod query | ✓ |
| GET | /accounting/general-ledger/accounts | `general-ledger.controller.ts:42` | `accounting:general-ledger:read` | JWT+Perm | ✗ | Zod query | ✓ |
| POST | /accounting/journal/:entryId/submit-approval | `journal-approvals.controller.ts:18` | `accounting:journal:create` | JWT+Perm | ✗ | ParseInt | — |
| POST | /accounting/journal/:entryId/approve | `journal-approvals.controller.ts:29` | `accounting:journal:approve` | JWT+Perm | ✗ | Zod body | — |
| POST | /accounting/journal/:entryId/reject | `journal-approvals.controller.ts:43` | `accounting:journal:approve` | JWT+Perm | ✗ | Zod body | — |
| GET | /accounting/periods | `periods.controller.ts:19` | `accounting:periods:read` | JWT+Perm | ✗ | none | ✗ |
| POST | /accounting/periods | `periods.controller.ts:27` | `accounting:periods:manage` | JWT+Perm | ✗ | Zod body | — |
| GET | /accounting/periods/:periodId/close-checklist | `periods.controller.ts:37` | `accounting:periods:read` | JWT+Perm | ✗ | ParseInt | — |
| POST | /accounting/periods/:periodId/close | `periods.controller.ts:47` | `accounting:periods:manage` | JWT+Perm | ✗ | ParseInt | — |
| POST | /accounting/periods/:periodId/lock | `periods.controller.ts:58` | `accounting:periods:manage` | JWT+Perm | ✗ | ParseInt | — |
| POST | /accounting/periods/:periodId/reopen | `periods.controller.ts:71` | `accounting:periods:reopen` | JWT+Perm | ✗ | ParseInt | — |

### `src/modules/accounting/settings/`

| Method | Path | File:Line | @RequirePermission | Guards | ModuleGuard? | Validation | Paginated? |
|--------|------|-----------|-------------------|--------|--------------|-----------|------------|
| GET | /accounting/settings | `accounting-settings.controller.ts:35` | `accounting:settings:read` | JWT+Perm (class) | ✗ | none | — |
| PATCH | /accounting/settings | `accounting-settings.controller.ts:41` | `accounting:settings:manage` | JWT+Perm (class) | ✗ | Zod body | — |
| GET | /accounting/settings/setup-status | `accounting-settings.controller.ts:50` | `accounting:settings:read` | JWT+Perm (class) | ✗ | none | — |
| GET | /accounting/settings/sequences | `accounting-settings.controller.ts:55` | `accounting:settings:read` | JWT+Perm (class) | ✗ | none | — |
| PATCH | /accounting/settings/payment-terms | `accounting-settings.controller.ts:62` | `accounting:settings:manage` | JWT+Perm (class) | ✗ | Zod body | — |
| PATCH | /accounting/settings/sequences/:entityType | `accounting-settings.controller.ts:71` | `accounting:settings:manage` | JWT+Perm (class) | ✗ | Zod body | — |
| GET | /accounting/coa/tree | `coa.controller.ts:22` | `accounting:accounts:read` | JWT+Perm (class) | ✗ | none | — |
| GET | /accounting/coa/templates | `coa.controller.ts:28` | `accounting:accounts:read` | JWT+Perm (class) | ✗ | none | — |
| POST | /accounting/coa/templates/apply | `coa.controller.ts:33` | `accounting:accounts:manage` | JWT+Perm (class) | ✗ | Zod body | — |
| POST | /accounting/coa/:accountId/deactivate | `coa.controller.ts:43` | `accounting:accounts:manage` | JWT+Perm (class) | ✗ | ParseInt | — |
| POST | /accounting/coa/:accountId/activate | `coa.controller.ts:52` | `accounting:accounts:manage` | JWT+Perm (class) | ✗ | ParseInt | — |
| DELETE | /accounting/coa/:accountId | `coa.controller.ts:62` | `accounting:accounts:manage` | JWT+Perm (class) | ✗ | ParseInt | — |
| GET | /accounting/dimensions | `dimensions.controller.ts:38` | `accounting:dimensions:read` | JWT+Perm (class) | ✗ | none | — |
| POST | /accounting/dimensions | `dimensions.controller.ts:43` | `accounting:dimensions:manage` | JWT+Perm (class) | ✗ | Zod body | — |
| PATCH | /accounting/dimensions/:dimensionId | `dimensions.controller.ts:52` | `accounting:dimensions:manage` | JWT+Perm (class) | ✗ | ParseInt+Zod | — |
| GET | /accounting/dimensions/:dimensionId/values | `dimensions.controller.ts:61` | `accounting:dimensions:read` | JWT+Perm (class) | ✗ | ParseInt | — |
| POST | /accounting/dimensions/:dimensionId/values | `dimensions.controller.ts:70` | `accounting:dimensions:manage` | JWT+Perm (class) | ✗ | ParseInt+Zod | — |
| PATCH | /accounting/dimensions/:dimensionId/values/:valueId | `dimensions.controller.ts:80` | `accounting:dimensions:manage` | JWT+Perm (class) | ✗ | ParseInt+Zod | — |
| GET | /accounting/settings/system-accounts | `system-accounts.controller.ts:25` | `accounting:settings:read` | JWT+Perm (class) | ✗ | none | — |
| PUT | /accounting/settings/system-accounts/:purpose | `system-accounts.controller.ts:30` | `accounting:settings:manage` | JWT+Perm (class) | ✗ | Zod param+body | — |
| GET | /accounting/opening-balances | `opening-balances.controller.ts:18` | `accounting:journal:read` | JWT+Perm (class) | ✗ | none | — |
| POST | /accounting/opening-balances | `opening-balances.controller.ts:24` | `accounting:journal:create` | JWT+Perm (class) | ✗ | Zod body | — |

### `src/modules/invoices/`

| Method | Path | File:Line | @RequirePermission | Guards | ModuleGuard? | Validation | Paginated? |
|--------|------|-----------|-------------------|--------|--------------|-----------|------------|
| GET | /invoices | `invoices.controller.ts:31` | `accounting:read` | JWT+Perm | ✗ | Zod query | ✓ |
| GET | /invoices/stats | `invoices.controller.ts:41` | `accounting:read` | JWT+Perm | ✗ | none | — |
| GET | /invoices/recurring | `invoices.controller.ts:47` | `accounting:read` | JWT+Perm | ✗ | none | ✗ |
| GET | /invoices/:invoiceId | `invoices.controller.ts:54` | `accounting:read` | JWT+Perm | ✗ | ParseInt | — |
| GET | /invoices/:invoiceId/payments | `invoices.controller.ts:67` | `accounting:read` | JWT+Perm | ✗ | ParseInt | ✗ |
| POST | /invoices | `invoices-write.controller.ts:39` | `accounting:create` | JWT+Perm | ✗ | Zod body+Idempotent | — |
| POST | /invoices/recurring/run | `invoices-write.controller.ts:52` | `accounting:manage` | JWT+Perm | ✗ | none | — |
| PATCH | /invoices/:invoiceId | `invoices-write.controller.ts:61` | `accounting:update` | JWT+Perm | ✗ | Zod body+Idempotent | — |
| POST | /invoices/:invoiceId/payments | `invoices-write.controller.ts:73` | `accounting:create` | JWT+Perm | ✗ | Zod body+Idempotent | — |
| POST | /invoices/:invoiceId/void | `invoices-write.controller.ts:87` | `accounting:manage` | JWT+Perm | ✗ | ParseInt+Idempotent | — |

### `src/modules/accounting/ai/`

| Method | Path | File:Line | @RequirePermission | Guards | ModuleGuard? | Validation | Paginated? |
|--------|------|-----------|-------------------|--------|--------------|-----------|------------|
| POST | /finance/ai/variance-explain | `accounting-ai.controller.ts:24` | `accounting:ai:use` | JWT+**ModuleGuard**+Perm+RateLimit | ✓ | Zod body | — |
| POST | /finance/ai/reconciliation-explain | `accounting-ai.controller.ts:33` | `accounting:ai:use` | JWT+**ModuleGuard**+Perm+RateLimit | ✓ | Zod body | — |
| POST | /finance/ai/extract-document | `accounting-ai.controller.ts:42` | `accounting:ai:use` | JWT+**ModuleGuard**+Perm+RateLimit | ✓ | Zod body | — |

**Note:** Finance module controllers (`finance/ap/`, `finance/ar/`, `finance/banking/`, `finance/assets/`, `finance/planning/`, `finance/reports/`, `finance/tax/`) all carry `@RequireModule("accounting")` but no `ModuleGuard` in `@UseGuards()`. Pattern identical to accounting core — omitted from table to avoid repetition, same finding applies uniformly.

**Totals (accounting+finance+invoices, excluding AI):** ~70+ endpoints. All have `JwtAuthGuard` + `PermissionGuard`. **Zero** (outside AI) have `ModuleGuard` despite all bearing `@RequireModule("accounting")` — the decorator is unenforceable without the guard.

**Unpaginated list GETs flagged:** `/accounting/purchase-bills/:billId/payments`, `/accounting/vendors/:vendorId/ledger`, `/accounting/customers/:clientId/ledger`, `/accounting/reports/aged-*`, GSTR-1/3B/trial-balance/P&L/balance-sheet/cash-flow, `/invoices/recurring`, `/invoices/:invoiceId/payments`.

---

## 8. Tenant Scoping / Transactions / N+1

### Tenant Scoping
All primary queries include `eq(table.orgId, orgId)`. No unscoped direct reads found in accounting/finance/invoices controllers — the `orgId` comes from the JWT (`@CurrentUser()`).

**One concern:** `recomputeInvoiceBalance(invoiceId, tx)` at `invoices-lifecycle.service.ts:24` — takes only `invoiceId`, not `orgId`. The internal query fetches `invoices.findFirst({ where: eq(invoices.id, invoiceId) })` without an `orgId` filter. This is called inside a transaction where `orgId` has already been checked, so the preceding service-level BOLA check protects it, but there is no defense-in-depth tenant filter at the recompute level.

### Multi-Table Writes Without Transaction
All critical writes in scope use `db.transaction()`:
- `FinancePostingService.postJournal()`: transaction at `finance-posting.service.ts:269`
- `InvoicesWriteService.createInvoice()`: transaction at `invoices-write.service.ts:94`
- `InvoicesPaymentService.recordPayment()`: transaction at `invoices-payment.service.ts:114`
- `InvoicesLifecycleService.voidInvoice()`: not wrapped — reads then separately updates invoice status (`invoices-lifecycle.service.ts:83-137`). The reversal is done via `financePosting.reverseJournal()` which uses its own transaction, then the invoice `UPDATE` happens outside. **Not atomic** — if the invoice UPDATE fails after the GL reversal, the entry is VOID but the invoice is not VOIDED.

### `await db` Inside Loops (N+1)
- `journal-posting.service.ts:165-169`: COA seed loop — `for (const row of DEFAULT_COA) { await this.db.insert(...) }` — **47 sequential inserts** on first call
- `invoices-lifecycle.service.ts:167-190`: `markOverdueInvoices` — `for (const inv of dueInvoices) { ... members query ... dispatch.emit }` — **N dispatch queries** inside loop (notification only, non-critical)
- `invoices-write.service.ts:300-328`: `generateDueRecurringInvoices` — `for (const due of dueInvoices) { await this.createInvoice(...) }` — **N sequential invoice creations** inside loop, each with its own transaction

---

## 9. LOC

### Over 500 Lines
| File | LOC |
|------|-----|
| `modules/finance/banking/reconciliation.service.ts` | 644 |
| `modules/finance/ap/payment-runs.service.ts` | 576 |
| `modules/accounting/core/finance-posting.service.ts` | 570 |

### Over 300 Lines
| File | LOC |
|------|-----|
| `modules/finance/reports/statement-reports.service.ts` | 461 |
| `modules/finance/assets/assets.service.ts` | 433 |
| `modules/finance/planning/budgets.service.ts` | 440 |
| `modules/accounting/core/accounting-payables.service.ts` | 422 |
| `modules/accounting/core/accounting-statements.service.ts` | 413 |
| `modules/accounting/core/journal-posting.service.ts` | 411 |
| `modules/accounting/core/accounting-ledger.service.ts` | 408 |
| `modules/finance/planning/forecast.service.ts` | 405 |
| `modules/accounting/core/accounting-gst.service.ts` | 397 |
| `modules/finance/assets/depreciation-runs.service.ts` | 371 |
| `modules/accounting/core/accounting-receivables.service.ts` | 367 |
| `modules/finance/banking/matching.service.ts` | 364 |
| `modules/accounting/gl/recurring-journals.service.ts` | ~est |
| `modules/invoices/invoices-write.service.ts` | 332 |
| `modules/finance/banking/imports.service.ts` | 303 |

---

## 10. Top Findings

| SEV | Finding | File:Line |
|-----|---------|-----------|
| P0 | **Payroll GL posting failure silently swallowed** — `try/catch` catches all errors from `postJournal()` and logs only; payroll is marked finalized but no GL entry is created; missing entries are invisible until a trial balance is run | `payroll-posting.service.ts:33-65` |
| P0 | **Float arithmetic in `JournalPostingService.assertBalanced()`** — balance check uses `reduce((acc, l) => acc + l.debit, 0)` with a `> 0.009` tolerance; an entry debiting 100.001 and crediting 100.009 passes as balanced; all invoice/bill GL postings go through this path | `journal-posting.service.ts:188-203` |
| P0 | **Float arithmetic in invoice line totals** — `subtotal`, `taxPool`, `total` computed via `round2()` (JS float) accumulating across line items; a 10-line invoice at 0.1+0.2 rates can accumulate ±0.01 error that enters the GL | `invoices-write.service.ts:60-73` |
| P0 | **No DB-level double-entry constraint** — `journal_lines` has no CHECK constraint or trigger asserting Σdebit = Σcredit per entry; any direct DB write or service bug bypassing `assertBalanced()` silently corrupts the ledger | `accounting.ts:69-100` |
| P1 | **Manual journal reversal does not VOID original entry** — `AccountingLedgerService.reverseJournalEntry()` creates a reversing entry but never sets the original to `VOID`; both remain `POSTED`, making trial balance and audit trail misleading | `accounting-ledger.service.ts:329-407` |
| P1 | **`ModuleGuard` absent from all accounting/finance/invoice controllers except AI** — `@RequireModule("accounting")` is a metadata decorator; without `ModuleGuard` in `@UseGuards()` it has no runtime effect; orgs with accounting disabled can call every GL/invoice/payment/bill endpoint | All controllers except `accounting-ai.controller.ts:20` |
| P1 | **`voidInvoice()` is not atomic** — `financePosting.reverseJournal()` commits its own transaction, then the invoice `UPDATE` to `VOIDED` runs outside; a crash between the two leaves the GL entry VOID but the invoice still `ISSUED` | `invoices-lifecycle.service.ts:108-136` |
| P1 | **Invoice number does not reset per financial year** — Indian GST requires sequential numbering per FY; `INV-2027-NNNN` continues from the total count across all years, not from 001; a single-year operation starting in year 2 would get `INV-2027-0501` not `INV-2027-0001` | `invoices-write.service.ts:103-104` |
| P1 | **`payments.amount` is `decimal(12,2)` while `journal_lines` uses `decimal(18,4)`** — scale mismatch means payment amounts stored at 2dp feed into GL comparisons at 4dp; `recomputeInvoiceBalance` uses `amount::numeric` which is fine, but the precision loss at insert time can cause off-by-0.005 comparisons | `invoicing.ts:79`, `accounting.ts:74` |
| P2 | **`parseFloat()` in `PayrollPostingService`** — `gross`, `deductions`, `net`, `employerCost` are converted via `parseFloat()` before float addition `(grossNum + employerCostNum).toFixed(4)`; amounts then enter the BigInt-based `FinancePostingService`, but if `gross ≠ net + deductions` by a float rounding difference the balance check throws and the error is swallowed (see P0) | `payroll-posting.service.ts:22-28` |
| P2 | **`recomputeInvoiceBalance()` has no `orgId` tenant filter** — `invoices.findFirst({ where: eq(invoices.id, invoiceId) })` — caller-level BOLA check is the only protection; a caller bug could recompute balance for an invoice in another org | `invoices-lifecycle.service.ts:30-33` |
| P2 | **N+1 in recurring invoice generation** — `generateDueRecurringInvoices()` iterates `dueInvoices` and calls `createInvoice()` per due invoice, each acquiring `pg_advisory_xact_lock` and opening a transaction; sequential contention scales poorly | `invoices-write.service.ts:300-328` |

---

## Coverage Gaps

- `finance/controls/` (approvals, exchange rates, FX gain/loss, provider-bridge) — not audited in depth
- `finance/expenses/` (receipts, reimbursements, policies) — not audited
- Credit note GL posting path (`finance/ar/credit-notes.service.ts`) — existence confirmed, posting details not traced
- Depreciation run GL posting (`finance/assets/depreciation-runs.service.ts`) — existence confirmed, not traced
- `finance/planning/` (budgets, forecasts, BVA, scenarios) — not audited
- e-Invoice / IRP API integration — schema search found no fields; no service traced; status `[UNVERIFIED — likely absent]`
- `recurring-journals.service.ts` — not audited; similar concerns expected re: float arithmetic
