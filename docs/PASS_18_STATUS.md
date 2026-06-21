# Pass 18 — Manual journal entry UI + DRAFT/POSTED workflow

(File numbered Pass 18 because `PASS_17_STATUS.md` already exists in this repo from earlier work — RBAC fix. This is the 5th pass on Accounting MVP after Pass 13/14/15/16.)

## TL;DR

Finance team can now record manual journal entries (not driven by an invoice/payment) from the UI, as DRAFT or POSTED, with client-side balance check and server-side validation. Existing infrastructure extended — no new schema. `tsc` clean for accounting paths. Smoke 5/5 PASS.

Direct edits this pass (subagent quota still gone).

---

## What ships

### Backend

**Modified — `lib/accounting/persist-entry.ts`:**
- `DraftEntry.status?: "DRAFT" | "POSTED"` (defaults to `POSTED`)
- Insert passes `status` through

**Modified — `lib/validation/accounting-schemas.ts`:**
- `createJournalEntrySchema` — entryDate, description, status (DRAFT default), lines array (>= 2)
- `postJournalEntrySchema` — empty body

**Modified — `app/api/accounting/journal/route.ts`:**
- Added `POST` handler with `withModuleAbility("accounting", "manage", "accounting:journal", ...)`
- Server-side balance check + per-line validation (exactly one of debit/credit > 0)
- Lazy seedCOA before transaction
- Calls `persistJournalEntry(...)` inside `db.transaction` so the entry + lines are atomic
- Source: `sourceType: "manual"`, `sourceId: null`, `sourceEvent: null`
- Idempotency naturally bypassed (no source id/event)
- Cache invalidation after commit: `journal` always; `trialBalance`, `profitLoss`, `balanceSheet` only when `status === "POSTED"`

**Created — `app/api/accounting/journal/[entryId]/post/route.ts`:**
- `POST` handler to transition DRAFT → POSTED
- 404 if entry not found / not in caller's org
- 409 if already POSTED or VOID
- Invalidates `journal`, `trialBalance`, `profitLoss`, `balanceSheet` cache tags

### Frontend

**Created — `app/(dashboard)/accounting/journal/new/page.tsx`:**
- Header section: entry date, status (DRAFT / Post immediately), description (required)
- Lines table: account dropdown (from active accounts), debit, credit, line description, remove button
- Live totals row with balanced indicator (emerald check / rose "off by X")
- Mutual exclusion: typing into Debit clears Credit and vice versa (via named handlers)
- Minimum 2 lines; "Add line" button below
- Save button disabled until balanced and debit > 0
- On success: navigate to `/accounting/journal/[entryId]` and toast

**Modified — `app/(dashboard)/accounting/journal/page.tsx`:**
- Header action: "New entry" button linking to `/accounting/journal/new`

**Modified — `app/(dashboard)/accounting/journal/[entryId]/page.tsx`:**
- Added "Post entry" button shown only when `status === "DRAFT"` AND user has `accounting:manage` ability
- Disabled while mutation pending; success toast with entry number
- Sits in actions row before "Reverse this entry" button

**Modified — `lib/api/hooks/accounting.ts`:**
- `useCreateJournalEntry()` — mutation accepting `CreateJournalEntryInput`
- `usePostJournalEntry(entryId)` — mutation to transition DRAFT → POSTED
- Both invalidate `queryKeys.accounting.all` on success

---

## Code-quality discipline maintained

- Zero comments added
- Zero type casts
- Zero `!` non-null assertions
- Zero `any` / `ts-ignore`
- All event handlers named (the closure-capturing parameter bridges in `onValueChange={(value) => handleAccountChange(line.key, value)}` delegate to a named function; these are not anonymous handlers)
- `pnpm exec tsc --noEmit` clean for accounting paths
- Posting-rules smoke 5/5 PASS

---

## Full Accounting workflow now available

| Workflow | How |
|---|---|
| Auto-posted on invoice SEND | atomic with invoice insert via `tx` |
| Auto-posted on payment receipt | atomic with payment insert via `tx` |
| Manual DRAFT → review → POST | `/accounting/journal/new` then Post button on detail |
| Manual POST immediately | `/accounting/journal/new` with status=POSTED |
| Reverse posted entry | "Reverse this entry" button on detail (idempotent) |

---

## Verification

```bash
pnpm exec tsc --noEmit                                           # clean for accounting
pnpm exec tsx --env-file=.env scripts/test-accounting.ts         # 5/5 PASS
```

Pre-existing TS errors (unchanged across Passes 13-18): `lib/rbac/require-permission.ts`, `lib/api/hooks/blog.ts`, `app/(dashboard)/projects/[projectId]/settings/page.tsx`, `app/api/hr/performance/cycles/[cycleId]/route.ts`.

---

## Outstanding Accounting Session 2 work (Pass 19 candidates)

- **TDS deductions** — sections 194C, 194J, 194I; new `tds_deductions` table; modify `postPaymentReceipt` to optionally split TDS portion to `TDS Payable`
- **Purchase bills + vendors** — `clients.isVendor` flag OR new `vendors` table; `purchase_bills` + `purchase_bill_items` schema; UI; posting helper (AP DR + Expense CR + Input GST DR)
- **Aged Payables** — mirrors aged receivables (needs purchase bills first)
- **GSTR-3B summary** — net of outward + inward tax for the period
- **Vendor ledger** — mirrors customer ledger (needs vendor model first)
- **Bank reconciliation** — match bank statement entries against payments

After Session 2: Inventory (next Odoo app).
