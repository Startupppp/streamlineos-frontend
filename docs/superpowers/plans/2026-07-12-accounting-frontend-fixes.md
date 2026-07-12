# Accounting Frontend Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all remaining violations from Checklists A, B, and C in the accounting module frontend — `error.message` → `getErrorMessage`, permission gates, backHref removal, badge removal, cast elimination, LoadingButton, and oversized page splits.

**Architecture:** All fixes are in `frontend/`. No backend changes. No new files unless splitting an oversized page forces a new feature component file. Every fix is self-contained and independently verifiable. NO git commands.

**Tech Stack:** Next.js App Router · TypeScript strict · TanStack Query v5 · shadcn/ui · `getErrorMessage` from `lib/get-error-message.ts` · `useCan` from `hooks/api/access` · `LoadingButton` from `components/ui/loading-button`

---

## Current State Summary (verified by reading files)

### Checklist A — Status

**A1 — `error.message` → `getErrorMessage`:** Still broken in:
- `app/(authenticated)/accounting/aged-payables/page.tsx:60`
- `app/(authenticated)/accounting/aged-receivables/page.tsx:60`
- `app/(authenticated)/accounting/balance-sheet/page.tsx:134`
- `app/(authenticated)/accounting/cash-flow/page.tsx:190`
- `app/(authenticated)/accounting/coa/page.tsx:211`
- `app/(authenticated)/accounting/customers/[clientId]/page.tsx:156`
- `app/(authenticated)/accounting/general-ledger/page.tsx:244`
- `app/(authenticated)/accounting/gstr-1/page.tsx:250`
- `app/(authenticated)/accounting/gstr-3b/page.tsx:106`
- `app/(authenticated)/accounting/journal/new/page.tsx:319`
- `app/(authenticated)/accounting/opening-balances/page.tsx:59`
- `app/(authenticated)/accounting/period-close/page.tsx:430`
- `app/(authenticated)/accounting/profit-loss/page.tsx:162`
- `app/(authenticated)/accounting/purchase-bills/new/page.tsx:314,317` (NOT the FormMessage `.message` uses on lines 572/601/623 — those are react-hook-form field errors, correct)
- `app/(authenticated)/accounting/taxes/page.tsx:254`
- `app/(authenticated)/accounting/trial-balance/page.tsx:81`
- `app/(authenticated)/accounting/vendors/[vendorId]/page.tsx:165`
- `features/accounting/core/recurring-journals-tab.tsx:187`

**Already done:** customers/page, vendors/page, journal/page (all use `getErrorMessage`).

**A2 — Permission gates:**
- COA page: `New account` button not gated. `Apply template` button not gated. Need `useCan("accounting:accounts:manage")`.
- credit-notes page: `New credit note` button not gated. Need `useCan("accounting:credit-notes:create")`.
- journal/new page: No `useCan("accounting:journal:create")` gate — whole form accessible without permission.
- purchase-bills/new page: No `useCan("accounting:payables:manage")` gate.
- purchase-bills list "New bill" CTA: **Already gated** (line 257 `const canManage = useCan("accounting:payables:manage")`).

**A3 — backHref removal:**
- `expenses/receipts/page.tsx:51` — has `backHref`, needs removal
- `expenses/reimbursements/page.tsx:37` — has `backHref`, needs removal
- `expenses/policies/page.tsx:147` — has `backHref`, needs removal
- `taxes/codes/page.tsx:236` — has `backHref`, needs removal
- `assets/depreciation/page.tsx:183` — has `backHref`, needs removal

**A4 — Bare-count badges:**
- `coa/page.tsx:165` — has `badge={totalCount > 0 ? \`${totalCount}\` : undefined}`, needs removal. Fold into subtitle.
- customers/page — **Already done** (no badge).

**A5 — vendor-credits page:** Raw `<table>` at line 141-160 in `CreditDetailSheet`. StatusFilter cast at line 184: `statusFilter as VendorCreditStatus` — this is a narrow cast from runtime string, needs a type guard.

**A6 — dimension-values-sheet.tsx:** Uses raw `Sheet` with `SheetContent/SheetHeader/SheetTitle` instead of `AppSheet`. No named `onOpenChange` handler (inline lambdas on lines 98, 162).

**A7 — fin-settings-sections.tsx:** Per-row edit buttons use inline lambdas (`onClick={() => setEditSeq(seq)}`). Delete button is plain `Button`, not `LoadingButton`. **fin-settings-dialogs.tsx:226** has `v as ApprovalRecordType` cast.

**A8 — Cast removal:**
- `expense-table.tsx:81,93,103` — uses `row as ExpenseWithExtras` casts. Fix: the `ExpenseWithRelations` type needs `policyFlag?: string; taxAmount?: string` added, or the local intersection type approach maintained without cast.
- `expense-detail-sheet.tsx` — no bad casts found (already clean).
- `create-account-dialog.tsx:64` — `editAccount.accountType as AccountValues["accountType"]`. Fix with a type guard.
- `edit-asset-sheet.tsx:70` — `asset.depreciationMethod as DepreciationMethod`. Fix via type guard.
- `edit-asset-sheet.tsx:109` — `v as DepreciationMethod`. Fix via type guard.
- `category-dialog.tsx:162` — `v as DepreciationMethod`. Fix via type guard.
- `recurring-bill-form-sheet.tsx:194` — `v as RecurringBillFormValues["frequency"]`. Fix via type guard.
- `collections-tab.tsx:219` — `value as CollectionActivityType`. Fix via type guard.
- `collections-tab.tsx:407` — `Object.keys(...) as CollectionActivityType[]`. Fix via type-safe array.
- `recurring-template-form-sheet.tsx:175` — `v as TemplateFormValues["frequency"]`. Fix via type guard.
- `credit-notes page:128` — `statusFilter as CreditNoteStatus`. Fix via type guard.
- `payment-runs page:115` — `value as RunStatusFilter`. Fix via type guard.
- `invoices page:184,185,201` — `statusFilter as InvoiceStatus`. Fix via type guard (already has `as const` but uses runtime casts).
- `assets page:131,468` — no casts found (already clean — uses `isDepreciationMethod` guard at line 498).

**A9 — Empty states with EmptyState + illustration:**
- `payment-reminders/page.tsx` — **Already done** (uses `illustrationPreset="automations"`).
- `recurring-journals-tab.tsx` — has inline ad-hoc empty state div, not `EmptyState` + illustration.
- `journal/page.tsx` — **Already done** (uses `EmptyDocumentsIllustration`).
- `vendors/page.tsx` — **Already done** (uses `EmptyTeamIllustration`).

**A10 — Hand-rolled pending buttons → LoadingButton:**
- `journal/page.tsx` — **Already done** (`SubmitApprovalButton` uses `LoadingButton`).
- `journal/new/page.tsx` — hand-rolled at lines 466-474. Fix: replace with `LoadingButton`.
- `purchase-bills/new/page.tsx` — hand-rolled at lines 769-778. Fix: replace with `LoadingButton`.

### Checklist B — Status

**All 5 pages already migrated to DataTable:** customers, vendors, journal, purchase-bills, assets.

### Checklist C — Status (line counts confirmed)

- `purchase-bills/new` — 795 lines, **not yet split**
- `purchase-bills/[billId]` — 603 lines, **not yet split**
- `journal/[entryId]` — 609 lines, **not yet split**
- `taxes/payments` — 530 lines, **not yet split**
- `invoices/[invoiceId]` — 509 lines, **not yet split**
- `period-close` — 502 lines, **not yet split**

---

## File Map

**Files to modify (A fixes):**
- `app/(authenticated)/accounting/aged-payables/page.tsx`
- `app/(authenticated)/accounting/aged-receivables/page.tsx`
- `app/(authenticated)/accounting/balance-sheet/page.tsx`
- `app/(authenticated)/accounting/cash-flow/page.tsx`
- `app/(authenticated)/accounting/coa/page.tsx`
- `app/(authenticated)/accounting/customers/[clientId]/page.tsx`
- `app/(authenticated)/accounting/general-ledger/page.tsx`
- `app/(authenticated)/accounting/gstr-1/page.tsx`
- `app/(authenticated)/accounting/gstr-3b/page.tsx`
- `app/(authenticated)/accounting/journal/new/page.tsx`
- `app/(authenticated)/accounting/opening-balances/page.tsx`
- `app/(authenticated)/accounting/period-close/page.tsx`
- `app/(authenticated)/accounting/profit-loss/page.tsx`
- `app/(authenticated)/accounting/purchase-bills/new/page.tsx`
- `app/(authenticated)/accounting/taxes/page.tsx`
- `app/(authenticated)/accounting/trial-balance/page.tsx`
- `app/(authenticated)/accounting/vendors/[vendorId]/page.tsx`
- `app/(authenticated)/accounting/credit-notes/page.tsx`
- `app/(authenticated)/accounting/expenses/receipts/page.tsx`
- `app/(authenticated)/accounting/expenses/reimbursements/page.tsx`
- `app/(authenticated)/accounting/expenses/policies/page.tsx`
- `app/(authenticated)/accounting/taxes/codes/page.tsx`
- `app/(authenticated)/accounting/assets/depreciation/page.tsx`
- `app/(authenticated)/accounting/vendor-credits/page.tsx`
- `app/(authenticated)/accounting/invoices/page.tsx`
- `app/(authenticated)/accounting/payment-runs/page.tsx`
- `features/accounting/core/recurring-journals-tab.tsx`
- `features/accounting/core/dimension-values-sheet.tsx`
- `features/accounting/settings/fin-settings-sections.tsx`
- `features/accounting/settings/fin-settings-dialogs.tsx`
- `features/accounting/expenses/expense-table.tsx`
- `features/accounting/create-account-dialog.tsx`
- `features/accounting/assets/edit-asset-sheet.tsx`
- `features/accounting/assets/category-dialog.tsx`
- `features/accounting/purchases/recurring-bill-form-sheet.tsx`
- `features/accounting/sales/collections-tab.tsx`
- `features/accounting/sales/recurring-template-form-sheet.tsx`

**Files to create (C splits):**
- `features/accounting/purchases/bill-form-fields.tsx` (extracted from purchase-bills/new)
- `features/accounting/purchases/bill-detail-panel.tsx` (extracted from purchase-bills/[billId])
- `features/accounting/core/journal-entry-detail-panel.tsx` (extracted from journal/[entryId])
- `features/accounting/taxes/tax-payments-table.tsx` (extracted from taxes/payments)
- `features/accounting/taxes/tax-adjustments-table.tsx` (extracted from taxes/payments)
- `features/accounting/sales/invoice-detail-panel.tsx` (extracted from invoices/[invoiceId])
- `features/accounting/core/period-close-checklist.tsx` (extracted from period-close)

---

## Task 1: A1 — Fix error.message → getErrorMessage (batch)

**Files:**
- Modify: `app/(authenticated)/accounting/aged-payables/page.tsx:60`
- Modify: `app/(authenticated)/accounting/aged-receivables/page.tsx:60`
- Modify: `app/(authenticated)/accounting/balance-sheet/page.tsx:134`
- Modify: `app/(authenticated)/accounting/cash-flow/page.tsx:190`
- Modify: `app/(authenticated)/accounting/coa/page.tsx:211`
- Modify: `app/(authenticated)/accounting/customers/[clientId]/page.tsx:156`
- Modify: `app/(authenticated)/accounting/general-ledger/page.tsx:244`
- Modify: `app/(authenticated)/accounting/gstr-1/page.tsx:250`
- Modify: `app/(authenticated)/accounting/gstr-3b/page.tsx:106`
- Modify: `app/(authenticated)/accounting/journal/new/page.tsx:319`
- Modify: `app/(authenticated)/accounting/opening-balances/page.tsx:59`
- Modify: `app/(authenticated)/accounting/period-close/page.tsx:430`
- Modify: `app/(authenticated)/accounting/profit-loss/page.tsx:162`
- Modify: `app/(authenticated)/accounting/purchase-bills/new/page.tsx:314,317`
- Modify: `app/(authenticated)/accounting/taxes/page.tsx:254`
- Modify: `app/(authenticated)/accounting/trial-balance/page.tsx:81`
- Modify: `app/(authenticated)/accounting/vendors/[vendorId]/page.tsx:165`
- Modify: `features/accounting/core/recurring-journals-tab.tsx:187`

- [ ] **Step 1: Read and patch each file**

For each file, add `import { getErrorMessage } from "@/lib/get-error-message";` if missing, then change `query.error.message` / `error.message` / `glQuery.error.message` / `periodsQuery.error.message` / `clientsQuery.error.message` / `accountsQuery.error.message` to `getErrorMessage(query.error)` etc. (match the variable name used in that file).

**aged-payables** — line 60: `description={getErrorMessage(query.error)}` (already imports? no — add import)
**aged-receivables** — same pattern
**balance-sheet** — same pattern  
**cash-flow** — same pattern
**coa** — line 211: `description={getErrorMessage(query.error)}`; also add `getErrorMessage` import
**customers/[clientId]** — same pattern
**general-ledger** — `description={getErrorMessage(glQuery.error)}`
**gstr-1** — same pattern
**gstr-3b** — same pattern
**journal/new** — line 319: `description={getErrorMessage(accountsQuery.error)}`; import already present
**opening-balances** — same pattern
**period-close** — line 430: `description={getErrorMessage(periodsQuery.error)}`
**profit-loss** — same pattern
**purchase-bills/new** — lines 314, 317: `description={getErrorMessage(clientsQuery.error)}` and `description={getErrorMessage(accountsQuery.error)}`; import already present
**taxes/page** — line 254: `description={getErrorMessage(error)}`; add import if missing
**trial-balance** — same pattern
**vendors/[vendorId]** — line 165: `description={getErrorMessage(query.error)}`; add import
**recurring-journals-tab** — line 187: `description={getErrorMessage(query.error)}`; add import if missing

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm -C frontend type-check`
Expected: Exit 0

---

## Task 2: A2 — Permission gates

**Files:**
- Modify: `app/(authenticated)/accounting/coa/page.tsx`
- Modify: `app/(authenticated)/accounting/credit-notes/page.tsx`
- Modify: `app/(authenticated)/accounting/journal/new/page.tsx`
- Modify: `app/(authenticated)/accounting/purchase-bills/new/page.tsx`

- [ ] **Step 1: Gate COA page actions**

Add to `coa/page.tsx`:
```tsx
import { useCan } from "@/hooks/api/access";
```
Inside `ChartOfAccountsPage`:
```tsx
const canManage = useCan("accounting:accounts:manage");
```
Change both action buttons:
```tsx
actions={
  <div className="flex items-center gap-2">
    {canManage && (
      <Button size="sm" variant="outline" onClick={handleOpenApplyTemplate}>
        <LayoutTemplate className="size-3.5 mr-1.5" />
        Apply template
      </Button>
    )}
    {canManage && (
      <Button size="sm" onClick={handleOpenCreate}>
        <Plus className="size-3.5 mr-1.5" />
        New account
      </Button>
    )}
  </div>
}
```
Also remove the bare-count badge (A4): delete `badge={totalCount > 0 ? \`${totalCount}\` : undefined}` and update subtitle to `"Manage ledger accounts grouped by type."` (already is that, no change needed there).

- [ ] **Step 2: Gate credit-notes "New credit note" button**

In `credit-notes/page.tsx`, add:
```tsx
import { useCan } from "@/hooks/api/access";
```
Inside `CreditNotesPage`:
```tsx
const canCreate = useCan("accounting:credit-notes:create");
```
Change the actions button:
```tsx
actions={
  canCreate ? (
    <Button size="sm" onClick={handleNewClick}>
      <Plus className="size-4 mr-1" />
      New credit note
    </Button>
  ) : undefined
}
```
Also update the empty state CTA already conditional on `canManage` — no change needed there.

- [ ] **Step 3: Gate journal/new whole form**

In `journal/new/page.tsx`, add:
```tsx
import { useCan } from "@/hooks/api/access";
import { EmptyState } from "@/components/ui/empty-state";
```
In the component (after the loading/error early returns, before the form render):
```tsx
const canCreate = useCan("accounting:journal:create");
```
Add after the `accountsQuery.error` early return block:
```tsx
if (!canCreate) {
  return (
    <PageWrapper eyebrow="Accounting · Journal" title="New journal entry" subtitle="Record a manual journal entry.">
      <EmptyState
        illustrationPreset="permissions"
        title="Access restricted"
        description="You don't have permission to create journal entries."
      />
    </PageWrapper>
  );
}
```

- [ ] **Step 4: Gate purchase-bills/new whole form**

Same pattern as journal/new. In `purchase-bills/new/page.tsx`:
```tsx
import { useCan } from "@/hooks/api/access";
import { EmptyState } from "@/components/ui/empty-state";
```
```tsx
const canManage = useCan("accounting:payables:manage");
```
Add after the `accountsQuery.error` early return:
```tsx
if (!canManage) {
  return (
    <PageWrapper eyebrow="Accounting · Purchase Bills" title="New purchase bill" subtitle="Record a vendor bill.">
      <EmptyState
        illustrationPreset="permissions"
        title="Access restricted"
        description="You don't have permission to create purchase bills."
      />
    </PageWrapper>
  );
}
```

- [ ] **Step 5: Verify typecheck passes**

Run: `pnpm -C frontend type-check`
Expected: Exit 0

---

## Task 3: A3 — Remove backHref + A4 badge fix

**Files:**
- Modify: `app/(authenticated)/accounting/expenses/receipts/page.tsx`
- Modify: `app/(authenticated)/accounting/expenses/reimbursements/page.tsx`
- Modify: `app/(authenticated)/accounting/expenses/policies/page.tsx`
- Modify: `app/(authenticated)/accounting/taxes/codes/page.tsx`
- Modify: `app/(authenticated)/accounting/assets/depreciation/page.tsx`
- Modify: `app/(authenticated)/accounting/coa/page.tsx` (badge — covered in Task 2)

- [ ] **Step 1: Remove backHref from 5 pages**

In each of the 5 files, find the `PageWrapper` prop `backHref="..."` and delete that prop line. No other changes.

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm -C frontend type-check`
Expected: Exit 0

---

## Task 4: A5 — vendor-credits: raw table → Table + status cast fix

**Files:**
- Modify: `app/(authenticated)/accounting/vendor-credits/page.tsx`

- [ ] **Step 1: Replace raw table in CreditDetailSheet with Table primitives**

The `CreditDetailSheet` component (lines ~92–167) has a raw `<table>` inside. Replace it with `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` from `@/components/ui/table` (already imported in the file? Check — if not, add the import).

Change:
```tsx
<table className="w-full text-xs">
  <thead>
    <tr className="bg-muted/40 border-b border-border">
      <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Description</th>
      <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">Qty</th>
      <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">Rate</th>
      <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">Amount</th>
    </tr>
  </thead>
  <tbody>
    {credit.items.map((item) => (
      <tr key={item.id} className="border-b border-border/50 last:border-0">
        <td className="px-3 py-1.5">{item.description}</td>
        <td className="px-3 py-1.5 text-right tabular-nums">{item.quantity}</td>
        <td className="px-3 py-1.5 text-right tabular-nums">{item.rate}</td>
        <td className="px-3 py-1.5 text-right tabular-nums font-medium">{item.amount}</td>
      </tr>
    ))}
  </tbody>
</table>
```
To:
```tsx
<Table className="text-xs">
  <TableHeader>
    <TableRow className="bg-muted/40 border-b border-border">
      <TableHead className="px-3 py-1.5 text-left font-medium text-muted-foreground">Description</TableHead>
      <TableHead className="px-3 py-1.5 text-right font-medium text-muted-foreground">Qty</TableHead>
      <TableHead className="px-3 py-1.5 text-right font-medium text-muted-foreground">Rate</TableHead>
      <TableHead className="px-3 py-1.5 text-right font-medium text-muted-foreground">Amount</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {credit.items.map((item) => (
      <TableRow key={item.id} className="border-b border-border/50 last:border-0">
        <TableCell className="px-3 py-1.5">{item.description}</TableCell>
        <TableCell className="px-3 py-1.5 text-right tabular-nums">{item.quantity}</TableCell>
        <TableCell className="px-3 py-1.5 text-right tabular-nums">{item.rate}</TableCell>
        <TableCell className="px-3 py-1.5 text-right tabular-nums font-medium">{item.amount}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

Add Table imports if missing:
```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
```

- [ ] **Step 2: Fix statusFilter cast**

At line 184:
```tsx
status: statusFilter !== "all" ? (statusFilter as VendorCreditStatus) : undefined,
```

Add a type guard function near the top of the file (after `STATUS_OPTIONS`):
```tsx
const VENDOR_CREDIT_STATUSES = ["DRAFT", "POSTED", "APPLIED", "VOID"] as const;
type VendorCreditStatusValue = typeof VENDOR_CREDIT_STATUSES[number];

function isVendorCreditStatus(value: string): value is VendorCreditStatusValue {
  return (VENDOR_CREDIT_STATUSES as ReadonlyArray<string>).includes(value);
}
```

Then change the query call:
```tsx
status: statusFilter !== "all" && isVendorCreditStatus(statusFilter) ? statusFilter : undefined,
```

Also remove the `import type { VendorCreditSummary, VendorCreditStatus }` and replace with `VendorCreditSummary` only if `VendorCreditStatus` is no longer used as a type elsewhere in the file. Check: if `VendorCreditStatus` was only used in the cast, remove it from the import.

- [ ] **Step 3: Verify typecheck passes**

Run: `pnpm -C frontend type-check`
Expected: Exit 0

---

## Task 5: A6 — dimension-values-sheet → AppSheet + named handlers

**Files:**
- Modify: `features/accounting/core/dimension-values-sheet.tsx`

- [ ] **Step 1: Replace raw Sheet with AppSheet, add named handlers**

The file uses `Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription` directly. AppSheet already provides this 3-zone structure. 

Read the file fully first to understand the exact structure (table + add/edit dialogs rendered outside the Sheet via state).

Replace the direct `Sheet` usage with `AppSheet`:
- Remove imports: `Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription`
- Add import: `import { AppSheet } from "@/components/shared/app-sheet";`
- Replace the outer `<Sheet open={open} onOpenChange={onOpenChange}>...<SheetContent>...<SheetHeader>...<SheetTitle>...<SheetDescription>` structure with `<AppSheet open={open} onOpenChange={onOpenChange} title={...} description={...}>`.

AppSheet interface:
```tsx
interface AppSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  side?: "right" | "left" | "top" | "bottom";
  className?: string;
}
```

Named handlers for inline lambdas (current violations):
- `onClick={() => setAddOpen(true)}` → create `function handleAddOpen(): void { setAddOpen(true); }` and use `onClick={handleAddOpen}`
- `onOpenChange={(o) => { if (!o) setEditValue(undefined); }}` → create:
```tsx
function handleEditValueOpenChange(open: boolean): void {
  if (!open) setEditValue(undefined);
}
```
and use `onOpenChange={handleEditValueOpenChange}`.

The footer zone of AppSheet is optional — the Add button can go in the body as it currently does.

Full replacement structure:
```tsx
export function DimensionValuesSheet({ open, onOpenChange, dimension, canManage }: Props) {
  const { data, isLoading } = useDimensionValues(dimension.id, open);
  const [addOpen, setAddOpen] = useState(false);
  const [editValue, setEditValue] = useState<AccountingDimensionValue | undefined>();

  function handleAddOpen(): void {
    setAddOpen(true);
  }

  function handleEditValueOpenChange(openState: boolean): void {
    if (!openState) setEditValue(undefined);
  }

  return (
    <>
      <AppSheet
        open={open}
        onOpenChange={onOpenChange}
        title={`${dimension.name} — Values`}
        description={dimension.key}
        className="w-[480px] sm:max-w-[480px]"
      >
        <div className="space-y-3">
          {canManage && (
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={handleAddOpen}>
                <Plus className="size-3.5 mr-1" />
                Add Value
              </Button>
            </div>
          )}
          {/* ... rest of content ... */}
        </div>
      </AppSheet>

      {addOpen && (
        <DimensionValueFormDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          dimensionId={dimension.id}
        />
      )}

      {editValue && (
        <DimensionValueFormDialog
          open={!!editValue}
          onOpenChange={handleEditValueOpenChange}
          dimensionId={dimension.id}
          value={editValue}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm -C frontend type-check`
Expected: Exit 0

---

## Task 6: A7 — fin-settings-sections: named handlers + LoadingButton; fin-settings-dialogs: cast fix

**Files:**
- Modify: `features/accounting/settings/fin-settings-sections.tsx`
- Modify: `features/accounting/settings/fin-settings-dialogs.tsx`

- [ ] **Step 1: Replace inline lambdas with named handlers in PoliciesSection**

Current violation (line ~83): `onClick={() => setEditSeq(seq)}`
These are row-level handlers that close over `seq` — they can't be extracted to a top-level named function cleanly. The pattern is: create a stable named factory or use `data-id` approach. However, a named local function per-map is fine per the rule "named handlers only".

Replace inline lambdas in each `map` callback by creating a small named component for each row that has its own handler:

For `SequencesSection`, create `SequenceRow` inline component:
```tsx
function SequenceRow({ seq, canManage, onEdit }: { seq: NumberSequence; canManage: boolean; onEdit: (s: NumberSequence) => void }) {
  function handleEdit(): void { onEdit(seq); }
  return (
    <TableRow key={seq.entityType} ...>
      ...
      {canManage && (
        <TableCell ...>
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleEdit}>Edit</Button>
        </TableCell>
      )}
    </TableRow>
  );
}
```

For `SystemAccountsSection`, create `SystemAccountRow` inline component similarly.

For `PoliciesSection`, create `PolicyRow` with `handleEdit` and pass `handleDeletePolicy` as a prop:
```tsx
function PolicyRow({
  policy,
  canManage,
  onEdit,
  onDelete,
  isDeleting,
}: {
  policy: ApprovalPolicy;
  canManage: boolean;
  onEdit: (p: ApprovalPolicy) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}) {
  function handleEdit(): void { onEdit(policy); }
  function handleDelete(): void { onDelete(policy.id); }
  return (
    <TableRow ...>
      ...
      {canManage && (
        <TableCell>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleEdit}>Edit</Button>
            <LoadingButton
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-destructive hover:text-destructive"
              onClick={handleDelete}
              isPending={isDeleting}
            >
              Delete
            </LoadingButton>
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}
```

Also add `LoadingButton` import:
```tsx
import { LoadingButton } from "@/components/ui/loading-button";
```

- [ ] **Step 2: Fix fin-settings-dialogs.tsx:226 cast**

Line ~226:
```tsx
onValueChange={(v) => form.setValue("recordType", v as ApprovalRecordType, { shouldValidate: true })}
```

Add a type guard near the top of the file (after `RECORD_TYPES` definition):
```tsx
function isApprovalRecordType(value: string): value is ApprovalRecordType {
  return (RECORD_TYPES as ReadonlyArray<string>).includes(value);
}
```

Replace the cast:
```tsx
onValueChange={(v) => { if (isApprovalRecordType(v)) form.setValue("recordType", v, { shouldValidate: true }); }}
```

But wait — this is an inline lambda on a shadcn Select. The handler itself needs to be named per the rule. Create:
```tsx
function handleRecordTypeChange(v: string): void {
  if (isApprovalRecordType(v)) form.setValue("recordType", v, { shouldValidate: true });
}
```
and use `onValueChange={handleRecordTypeChange}`.

Since this is inside a render prop (`{(form) => (...)}`) the function is local to that scope, which is acceptable.

- [ ] **Step 3: Verify typecheck passes**

Run: `pnpm -C frontend type-check`
Expected: Exit 0

---

## Task 7: A8 — Cast removal batch

**Files:**
- Modify: `features/accounting/expenses/expense-table.tsx` (casts on `row as ExpenseWithExtras`)
- Modify: `features/accounting/create-account-dialog.tsx` (cast on `accountType`)
- Modify: `features/accounting/assets/edit-asset-sheet.tsx` (cast on `depreciationMethod`)
- Modify: `features/accounting/assets/category-dialog.tsx` (cast on `defaultMethod`)
- Modify: `features/accounting/purchases/recurring-bill-form-sheet.tsx` (cast on `frequency`)
- Modify: `features/accounting/sales/collections-tab.tsx` (cast on `CollectionActivityType`)
- Modify: `features/accounting/sales/recurring-template-form-sheet.tsx` (cast on `frequency`)
- Modify: `app/(authenticated)/accounting/credit-notes/page.tsx` (cast on `CreditNoteStatus`)
- Modify: `app/(authenticated)/accounting/payment-runs/page.tsx` (cast on `RunStatusFilter`)
- Modify: `app/(authenticated)/accounting/invoices/page.tsx` (cast on `InvoiceStatus`)

- [ ] **Step 1: Fix expense-table.tsx casts**

The `ExpenseWithExtras` intersection type is defined locally in both `expense-table.tsx` and `expense-detail-sheet.tsx`. The casts `row as ExpenseWithExtras` happen because `data` is typed as `ExpenseWithRelations[]` but the actual objects may have extra fields.

The fix: **keep the intersection type approach but avoid the cast** by overloading `ExpenseTableProps` to accept `ExpenseWithExtras[]` instead of `ExpenseWithRelations[]`. But that would require updating callers.

Simpler: rename the data prop type in `ExpenseTable` to accept the intersection:
```tsx
interface ExpenseTableProps {
  data: Array<ExpenseWithRelations & { policyFlag?: string; taxAmount?: string }>;
  // ...
}
```

Then update `COLUMNS` to use the wider type, removing the cast:
```tsx
const COLUMNS: DataTableColumn<ExpenseWithRelations & { policyFlag?: string; taxAmount?: string }>[] = [
```

And update each cast `(row as ExpenseWithExtras).taxAmount` → `row.taxAmount`, etc.

Also fix the `status` cast at line 93:
```tsx
const status = row.status as ExpenseStatus | null;
```
Check the `ExpenseWithRelations` type — if `status` is already typed as the right type, remove the cast. If it's `string`, add a type guard or widen the prop type.

- [ ] **Step 2: Fix create-account-dialog.tsx:64 cast**

Line 64: `accountType: editAccount.accountType as AccountValues["accountType"]`

Check the type of `editAccount.accountType`. It's likely `string` from an API response. The `AccountValues["accountType"]` is a literal union from the `ACCOUNT_TYPES` const.

Add a type guard:
```tsx
function isAccountType(value: string): value is AccountValues["accountType"] {
  return (ACCOUNT_TYPES as ReadonlyArray<string>).includes(value);
}
```

Then in `defaultValues`:
```tsx
accountType: isAccountType(editAccount.accountType) ? editAccount.accountType : "ASSET",
```

- [ ] **Step 3: Fix DepreciationMethod casts in edit-asset-sheet.tsx and category-dialog.tsx**

In `edit-asset-sheet.tsx`, add (or reuse if already present):
```tsx
const DEPRECIATION_METHODS = ["STRAIGHT_LINE", "DECLINING_BALANCE", "UNITS_OF_PRODUCTION"] as const;
type DepreciationMethod = typeof DEPRECIATION_METHODS[number];
function isDepreciationMethod(v: string): v is DepreciationMethod {
  return (DEPRECIATION_METHODS as ReadonlyArray<string>).includes(v);
}
```
(If `DepreciationMethod` is already imported from types, import and use a guard.)

Replace line 70: `depreciationMethod: asset.depreciationMethod as DepreciationMethod`
→ `depreciationMethod: isDepreciationMethod(asset.depreciationMethod) ? asset.depreciationMethod : "STRAIGHT_LINE"`

Replace line 109: `onValueChange={(v) => form.setValue("depreciationMethod", v as DepreciationMethod)}`
→ create named handler using `isDepreciationMethod`.

Apply same pattern to `category-dialog.tsx:162`.

- [ ] **Step 4: Fix frequency casts in recurring-bill-form-sheet.tsx and recurring-template-form-sheet.tsx**

For each file, the `frequency` field is from a Zod enum. The Select's `onValueChange` returns `string`. Add a type guard using the Zod enum values and use it in the handler. Example for `recurring-bill-form-sheet.tsx`:

```tsx
const FREQUENCY_VALUES = ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"] as const;
type Frequency = typeof FREQUENCY_VALUES[number];
function isFrequency(v: string): v is Frequency {
  return (FREQUENCY_VALUES as ReadonlyArray<string>).includes(v);
}
```

Replace `form.setValue("frequency", v as RecurringBillFormValues["frequency"], ...)` with:
```tsx
function handleFrequencyChange(v: string): void {
  if (isFrequency(v)) form.setValue("frequency", v, { shouldValidate: true });
}
```

Note: read the actual Zod schema definition in these files to get the exact frequency enum values before writing the guard.

- [ ] **Step 5: Fix CollectionActivityType casts in collections-tab.tsx**

At line 219: `setActivityType(value as CollectionActivityType)` — need a type guard.
At line 407: `Object.keys(ACTIVITY_TYPE_LABELS) as CollectionActivityType[]` — instead, define the keys explicitly:

```tsx
const COLLECTION_ACTIVITY_TYPES = Object.keys(ACTIVITY_TYPE_LABELS) as Array<keyof typeof ACTIVITY_TYPE_LABELS>;
```

Since `ACTIVITY_TYPE_LABELS` is an object with `CollectionActivityType` keys, `keyof typeof ACTIVITY_TYPE_LABELS` IS `CollectionActivityType` — this is type-safe without a cast. Use:
```tsx
{COLLECTION_ACTIVITY_TYPES.map(...)}
```

For line 219, add a guard:
```tsx
function isCollectionActivityType(v: string): v is CollectionActivityType {
  return v in ACTIVITY_TYPE_LABELS;
}
```
And in the handler: `if (isCollectionActivityType(value)) setActivityType(value);`

- [ ] **Step 6: Fix credit-notes page:128 and payment-runs page:115 casts**

**credit-notes page**: 
Add type guard after `CreditNoteStatus` type import:
```tsx
const CREDIT_NOTE_STATUSES = ["DRAFT", "POSTED", "APPLIED", "VOID"] as const;
function isCreditNoteStatus(v: string): v is CreditNoteStatus {
  return (CREDIT_NOTE_STATUSES as ReadonlyArray<string>).includes(v);
}
```
Replace line 128: `status: statusFilter !== "all" ? (statusFilter as CreditNoteStatus) : undefined`
→ `status: statusFilter !== "all" && isCreditNoteStatus(statusFilter) ? statusFilter : undefined`

**payment-runs page**:
Read `payment-runs/page.tsx` to understand `RunStatusFilter` type. Add a type guard and named handler replacing the `setStatusFilter(value as RunStatusFilter)` pattern.

- [ ] **Step 7: Fix invoices page:184,185,201 casts**

Read the full invoices page to understand `DisplayStatus`, `InvoiceStatus`, and `SERVER_FILTERABLE`. The pattern uses `as const` array properly but then casts `statusFilter` in conditions. Fix by adding a type guard:
```tsx
function isInvoiceStatus(v: string): v is InvoiceStatus {
  return SERVER_FILTERABLE.includes(v as InvoiceStatus);
}
```
Then replace:
- Line 184: `statusFilter !== "ALL" && SERVER_FILTERABLE.includes(statusFilter as InvoiceStatus)` → `statusFilter !== "ALL" && isInvoiceStatus(statusFilter)`
- Line 185: `? (statusFilter as InvoiceStatus)` → `? statusFilter`
- Line 201: `statusFilter !== "ALL" && !SERVER_FILTERABLE.includes(statusFilter as InvoiceStatus)` → `statusFilter !== "ALL" && !isInvoiceStatus(statusFilter)`

- [ ] **Step 8: Verify typecheck passes**

Run: `pnpm -C frontend type-check`
Expected: Exit 0

---

## Task 8: A9 — Empty state in recurring-journals-tab

**Files:**
- Modify: `features/accounting/core/recurring-journals-tab.tsx`

- [ ] **Step 1: Replace ad-hoc empty div with EmptyState**

The current empty state at lines ~191-200 is:
```tsx
<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 py-10 px-6 text-center">
  <h3 className="text-sm font-semibold text-foreground">No recurring templates</h3>
  <p className="mt-1 text-sm text-muted-foreground max-w-xs">
    Create a template to auto-generate journal entries on a schedule.
  </p>
  <Button size="sm" className="mt-4" onClick={handleOpenCreate}>
    <Plus className="mr-2 h-4 w-4" />
    New template
  </Button>
</div>
```

Replace with:
```tsx
import { EmptyState } from "@/components/ui/empty-state";
```
(add to imports if not present)

```tsx
<EmptyState
  illustrationPreset="documents"
  title="No recurring templates"
  description="Create a template to auto-generate journal entries on a schedule."
  action={{ label: "New template", onClick: handleOpenCreate }}
/>
```

Also fix the `error.message` → `getErrorMessage` (from Task 1, same file line 187) and add the import if not already added.

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm -C frontend type-check`
Expected: Exit 0

---

## Task 9: A10 — LoadingButton for submit buttons

**Files:**
- Modify: `app/(authenticated)/accounting/journal/new/page.tsx`
- Modify: `app/(authenticated)/accounting/purchase-bills/new/page.tsx`

- [ ] **Step 1: Replace hand-rolled submit in journal/new**

Current (lines 462-476):
```tsx
<div className="flex justify-end gap-2">
  <Button type="button" variant="outline" onClick={handleCancel}>
    Cancel
  </Button>
  <Button
    type="submit"
    disabled={createMutation.isPending || !totals.balanced}
  >
    {createMutation.isPending
      ? "Saving…"
      : watchedStatus === "POSTED"
        ? "Create and post"
        : "Save as draft"}
  </Button>
</div>
```

Replace with (keeping `LoadingButton` which is already imported):
```tsx
<div className="flex justify-end gap-2">
  <Button type="button" variant="outline" onClick={handleCancel}>
    Cancel
  </Button>
  <LoadingButton
    type="submit"
    isPending={createMutation.isPending}
    disabled={!totals.balanced}
    loadingText="Saving…"
  >
    {watchedStatus === "POSTED" ? "Create and post" : "Save as draft"}
  </LoadingButton>
</div>
```

Check if `LoadingButton` is already imported; if not, add:
```tsx
import { LoadingButton } from "@/components/ui/loading-button";
```

- [ ] **Step 2: Replace hand-rolled submit in purchase-bills/new**

Current (lines 769-778):
```tsx
<Button
  type="submit"
  className="w-full sm:w-auto"
  disabled={createMutation.isPending}
>
  {createMutation.isPending
    ? "Saving…"
    : watchedStatus === "POSTED"
      ? "Create and post"
      : "Save as draft"}
</Button>
```

Replace with:
```tsx
<LoadingButton
  type="submit"
  className="w-full sm:w-auto"
  isPending={createMutation.isPending}
  loadingText="Saving…"
>
  {watchedStatus === "POSTED" ? "Create and post" : "Save as draft"}
</LoadingButton>
```

Add `LoadingButton` import if not present.

- [ ] **Step 3: Verify typecheck passes**

Run: `pnpm -C frontend type-check`
Expected: Exit 0

---

## Task 10: C — Split purchase-bills/new (795 → target ≤500)

**Files:**
- Modify: `app/(authenticated)/accounting/purchase-bills/new/page.tsx`
- Create: `features/accounting/purchases/bill-form-fields.tsx`

- [ ] **Step 1: Read the full purchase-bills/new page**

Read all 795 lines. Identify the cohesive sections:
1. Schema + type definitions (lines ~50-150)
2. Bill form component with line items (the actual JSX render ~300-795)

The form JSX contains: header fields, line items table, GST summary, and submit. These are already partially extracted into `features/accounting/purchases/bill-header-fields.tsx`, `bill-gst-fields.tsx`, `bill-line-items-editor.tsx`. 

The page likely still has a big inline form. Extract the form card sections into a `BillNewFormBody` component in `features/accounting/purchases/bill-form-fields.tsx` that accepts the `form`, `vendors`, `expenseAccounts`, `taxRates`, etc. as props.

Target: page file ≤300 lines (orchestration: hooks, submit handler, loading/error states, PageWrapper), feature component ≤300 lines (form body).

- [ ] **Step 2: Create features/accounting/purchases/bill-form-fields.tsx**

Extract the `<Form>` + `<form>` body JSX (from inside `PageWrapper`) into a named component. Pass `form`, mutation state, `vendors`, `expenseAccounts`, `taxRates` as typed props.

- [ ] **Step 3: Update purchase-bills/new/page.tsx**

Import and use `BillNewFormBody` from the feature file. The page retains: imports, schema, hooks, handlers, early returns, and the `PageWrapper` with `<BillNewFormBody .../>` inside.

- [ ] **Step 4: Verify line counts and typecheck**

Run: `wc -l frontend/app/(authenticated)/accounting/purchase-bills/new/page.tsx frontend/features/accounting/purchases/bill-form-fields.tsx`
Expected: both under 500 lines.
Run: `pnpm -C frontend type-check`
Expected: Exit 0

---

## Task 11: C — Split purchase-bills/[billId] (603 → target ≤500)

**Files:**
- Modify: `app/(authenticated)/accounting/purchase-bills/[billId]/page.tsx`
- Create: `features/accounting/purchases/bill-detail-panel.tsx`

- [ ] **Step 1: Read full bill detail page**

Identify sections: bill header info, line items table, payment history, action buttons (post, submit for approval, approve, cancel). The action dialogs (AlertDialog, ConfirmDialog) are the bulkiest inline chunks.

- [ ] **Step 2: Extract BillDetailPanel**

Create `features/accounting/purchases/bill-detail-panel.tsx` containing: bill info grid, line items table, payment history table. Props: `bill` (typed), `canManage`, `canApprove`, action handlers.

- [ ] **Step 3: Update page**

Page retains: params extraction, query hooks, permission hooks, action handlers, dialogs, PageWrapper. Pass bill data to `BillDetailPanel`.

- [ ] **Step 4: Verify line counts and typecheck**

Run: `wc -l` on both files.
Run: `pnpm -C frontend type-check`

---

## Task 12: C — Split journal/[entryId] (609 → target ≤500)

**Files:**
- Modify: `app/(authenticated)/accounting/journal/[entryId]/page.tsx`
- Create: `features/accounting/core/journal-entry-detail-panel.tsx`

- [ ] **Step 1: Read full journal entry detail page**

Identify: entry header, journal lines table, approval section, reverse/void dialogs.

- [ ] **Step 2: Extract JournalEntryDetailPanel**

Create `features/accounting/core/journal-entry-detail-panel.tsx` with: entry header info, lines table. Props: `entry` (full type), `canPost`, `canApprove`, action handlers.

- [ ] **Step 3: Update page**

Page retains: params, hooks, handlers, dialogs (AlertDialog for approve/reject/reverse), PageWrapper.

- [ ] **Step 4: Verify line counts and typecheck**

---

## Task 13: C — Split taxes/payments (530 → target ≤500)

**Files:**
- Modify: `app/(authenticated)/accounting/taxes/payments/page.tsx`
- Create: `features/accounting/taxes/tax-payments-table.tsx`
- Create: `features/accounting/taxes/tax-adjustments-table.tsx`

- [ ] **Step 1: Read full taxes/payments page**

Identify sections: tax payments table with form/list combined, adjustments section with separate form. These can be extracted as separate components.

- [ ] **Step 2: Extract TaxPaymentsTable and TaxAdjustmentsTable**

Each extracted component takes query data, mutation handlers, and permission props.

- [ ] **Step 3: Update page**

Page orchestrates: useCan, useQuery hooks, PageWrapper with the two components as tabs or sections.

- [ ] **Step 4: Verify line counts and typecheck**

---

## Task 14: C — Split invoices/[invoiceId] (509 → target ≤500)

**Files:**
- Modify: `app/(authenticated)/accounting/invoices/[invoiceId]/page.tsx`
- Create: `features/accounting/sales/invoice-detail-panel.tsx`

- [ ] **Step 1: Read full invoice detail page**

Identify: invoice header, line items table, payments history, credit notes applied section, action buttons.

- [ ] **Step 2: Extract InvoiceDetailPanel**

Create `features/accounting/sales/invoice-detail-panel.tsx` with: invoice info grid, line items table, payment history. Props: `invoice`, `payments`, `creditNotes`, action handlers.

- [ ] **Step 3: Update page**

Page retains: params, hooks, record payment dialog, PageWrapper.

- [ ] **Step 4: Verify line counts and typecheck**

---

## Task 15: C — Split period-close (502 → target ≤500)

**Files:**
- Modify: `app/(authenticated)/accounting/period-close/page.tsx`
- Create: `features/accounting/core/period-close-checklist.tsx` (may already exist — check before creating)

- [ ] **Step 1: Check existing period-checklist-panel.tsx**

`features/accounting/core/period-checklist-panel.tsx` already exists. Read it to see what it contains — if it already covers the checklist, the split may just be moving existing inline JSX to use it.

Read `period-close/page.tsx` to see what's still inline.

- [ ] **Step 2: Extract period close period selector + close dialog section**

If `period-checklist-panel.tsx` doesn't cover the full inline content, extract the remaining inline JSX (period list table, close/reopen action buttons, dialogs) into a dedicated component.

- [ ] **Step 3: Update page**

Page orchestrates: hooks, handlers, PageWrapper with extracted component.

- [ ] **Step 4: Verify line counts and typecheck**

---

## Task 16: Final typecheck

- [ ] **Step 1: Run full typecheck**

Run: `pnpm -C frontend type-check`
Expected: Exit 0

- [ ] **Step 2: Report per-item verdicts**

For each checklist item, report:
- **was-done**: already complete before this work
- **completed-by-you**: fixed in this task
- **skipped+reason**: not applicable or blocked

Include final line counts for all 6 split pages.
