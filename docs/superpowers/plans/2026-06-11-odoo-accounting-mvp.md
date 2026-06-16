# Odoo Accounting MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a GST-aware double-entry accounting MVP that auto-posts journal entries from existing invoice/payment events and surfaces Trial Balance + P&L reports — Indian-SMB-ready out of the box.

**Architecture:** Append-only general ledger driven by pure posting-helper functions called inside the same DB transaction as the originating invoice/payment write. Idempotent via a `UNIQUE(orgId, sourceType, sourceId, sourceEvent)` constraint on journal entries. All GL math (CGST/SGST/IGST split, debit/credit balance) lives in `lib/accounting/`. UI uses existing `DS` tokens, `PageWrapper`, `ListToolbar`, `EntityFormSheet`.

**Tech Stack:** Next.js 16 (app router), Drizzle ORM + Postgres, NextAuth, TanStack Query v5, zod v4, `decimal` postgres columns (precision 18, scale 4), no formal test framework (smoke via `tsx` script + `pnpm exec tsc --noEmit`).

**Project rules honored:**
- No `git commit` from Claude — checkpoints at end of each task for user review and manual commit
- `.env` / `.env.example` untouched
- Auth pages (`app/(auth)/**`) untouched
- No type casts to silence TS (per `feedback_no_type_casts.md`)
- Default to zero code comments (per `feedback_comments.md`)

**Spec source:** `docs/superpowers/specs/2026-06-11-odoo-accounting-mvp-design.md`

**Mid-execution amendment (2026-06-11):** The new chart-of-accounts table is renamed `ledger_accounts` (TS: `ledgerAccounts`) to avoid colliding with NextAuth's existing `accounts` (OAuth identity) table. All `accounts` references in code below should read `ledgerAccounts` instead. Domain concept is unchanged. SQL is `ledger_accounts`, indices/uniques renamed accordingly (`uniq_ledger_accounts_org_code`, `idx_ledger_accounts_org_type_active`). Account-id references stay as `account_id` / `accountId` in `journal_lines` since "ledgerAccount" is verbose — only the table name and primary export rename.

**Drizzle workflow amendment:** Migrations are hand-written SQL in this repo (drizzle/meta is partial; auto-generate is interactive and would re-emit much of the live schema). All schema tasks emit a hand-written `drizzle/0XXX_<name>.sql` following the style of `drizzle/0101_add_quotes_module.sql` (uses `IF NOT EXISTS` and `EXCEPTION WHEN duplicate_object` guards).

---

## File map — what each new file is responsible for

```
lib/db/schema/accounting.ts          GL tables: accounts, journal_entries, journal_lines, indian_states + relations
lib/accounting/posting-rules.ts      Static account-code lookup + GST split math (pure)
lib/accounting/post-invoice.ts       Build journal entry payload for invoice "send" event
lib/accounting/post-payment.ts       Build journal entry payload for payment "receipt" event
lib/accounting/persist-entry.ts      Insert journal entry + lines inside a Drizzle transaction with idempotency
lib/accounting/seed-coa.ts           50-account Indian-standard COA seed (idempotent per org)
lib/accounting/seed-states.ts        29-state Indian state-code seed (idempotent globally)
lib/accounting/numbering.ts          "JE-YYYY-NNNNNN" generator with retry-on-unique-violation
lib/validation/accounting-schemas.ts zod for accounts CRUD, journal queries, report queries
lib/api/hooks/accounting.ts          TanStack query/mutation hooks

types/accounting.ts                  Account, JournalEntry, JournalLine, TrialBalanceRow, ProfitLossRow

app/api/accounting/accounts/route.ts                        GET list, POST create
app/api/accounting/accounts/[accountId]/route.ts            PATCH update
app/api/accounting/journal/route.ts                         GET list with filters
app/api/accounting/journal/[entryId]/route.ts               GET detail
app/api/accounting/reports/trial-balance/route.ts           GET as-of-date trial balance
app/api/accounting/reports/profit-loss/route.ts             GET date-range P&L

app/(dashboard)/accounting/layout.tsx                       RBAC gate at segment
app/(dashboard)/accounting/page.tsx                         Hub: stat cards + quick links
app/(dashboard)/accounting/coa/page.tsx                     COA list grouped by type
app/(dashboard)/accounting/coa/[accountId]/page.tsx         Account detail with recent lines
app/(dashboard)/accounting/journal/page.tsx                 Journal entry list
app/(dashboard)/accounting/journal/[entryId]/page.tsx       Single entry header + lines
app/(dashboard)/accounting/reports/trial-balance/page.tsx   TB UI
app/(dashboard)/accounting/reports/profit-loss/page.tsx     P&L UI

scripts/migrate-invoice-items.ts     One-time JSONB → invoice_items extractor (idempotent)
scripts/test-accounting.ts           tsx smoke for posting helpers and TB balance
```

## Files modified (not new)

```
lib/db/schema/crm.ts          additive columns on invoices, new invoice_items table + relations, clients.gstin
lib/db/schema/enums.ts        accountTypeEnum, journalEntryStatusEnum
lib/db/schema/index.ts        re-export accounting schema
lib/api/cache-tags.ts         add accounts, journal, trialBalance, profitLoss
types/invoice.ts              add place_of_supply, customer_gstin, cgst/sgst/igst, line item gst_rate + hsn_sac_code
app/api/invoices/route.ts            updated zod, call postInvoice on SEND
app/api/invoices/[invoiceId]/route.ts  same
app/api/payments/route.ts            updated zod, call postPayment on create
app/(dashboard)/billing/invoices/new/page.tsx          GST UI section
app/(dashboard)/billing/invoices/[invoiceId]/edit/page.tsx  GST UI section (if file exists; otherwise skip)
components/layout/app-sidebar.tsx    Accounting section + sub-links, role-gated
lib/validation/index.ts       re-export accounting-schemas
```

---

# Tasks

## Task 1: Add enums + Indian states seed table

**Files:**
- Modify: `lib/db/schema/enums.ts`
- Create: `lib/accounting/seed-states.ts`

- [ ] **Step 1.1 — Add enums to `lib/db/schema/enums.ts`**

Append at end of file:

```ts
export const accountTypeEnum = pgEnum("account_type", ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"]);
export const journalEntryStatusEnum = pgEnum("journal_entry_status", ["DRAFT", "POSTED", "VOID"]);
```

- [ ] **Step 1.2 — Create `lib/accounting/seed-states.ts`**

```ts
import "server-only";
import { db } from "@/lib/db";
import { indianStates } from "@/lib/db/schema/accounting";

const STATES: ReadonlyArray<{ stateCode: string; stateName: string }> = [
  { stateCode: "01", stateName: "Jammu and Kashmir" },
  { stateCode: "02", stateName: "Himachal Pradesh" },
  { stateCode: "03", stateName: "Punjab" },
  { stateCode: "04", stateName: "Chandigarh" },
  { stateCode: "05", stateName: "Uttarakhand" },
  { stateCode: "06", stateName: "Haryana" },
  { stateCode: "07", stateName: "Delhi" },
  { stateCode: "08", stateName: "Rajasthan" },
  { stateCode: "09", stateName: "Uttar Pradesh" },
  { stateCode: "10", stateName: "Bihar" },
  { stateCode: "11", stateName: "Sikkim" },
  { stateCode: "12", stateName: "Arunachal Pradesh" },
  { stateCode: "13", stateName: "Nagaland" },
  { stateCode: "14", stateName: "Manipur" },
  { stateCode: "15", stateName: "Mizoram" },
  { stateCode: "16", stateName: "Tripura" },
  { stateCode: "17", stateName: "Meghalaya" },
  { stateCode: "18", stateName: "Assam" },
  { stateCode: "19", stateName: "West Bengal" },
  { stateCode: "20", stateName: "Jharkhand" },
  { stateCode: "21", stateName: "Odisha" },
  { stateCode: "22", stateName: "Chhattisgarh" },
  { stateCode: "23", stateName: "Madhya Pradesh" },
  { stateCode: "24", stateName: "Gujarat" },
  { stateCode: "27", stateName: "Maharashtra" },
  { stateCode: "29", stateName: "Karnataka" },
  { stateCode: "32", stateName: "Kerala" },
  { stateCode: "33", stateName: "Tamil Nadu" },
  { stateCode: "36", stateName: "Telangana" },
  { stateCode: "37", stateName: "Andhra Pradesh" },
];

export async function seedIndianStates() {
  for (const row of STATES) {
    await db.insert(indianStates).values({ ...row, gstStateCode: row.stateCode }).onConflictDoNothing();
  }
}
```

- [ ] **Step 1.3 — User reviews; stop here**

Skip running until Task 2 is also written (the seed references `indianStates` which is created in Task 2).

---

## Task 2: Accounting schema file + relations

**Files:**
- Create: `lib/db/schema/accounting.ts`
- Modify: `lib/db/schema/index.ts`

- [ ] **Step 2.1 — Create `lib/db/schema/accounting.ts`**

```ts
import { boolean, date, decimal, index, integer, pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations, users } from "./auth";
import { accountTypeEnum, journalEntryStatusEnum } from "./enums";

export const indianStates = pgTable("indian_states", {
  stateCode: text("state_code").primaryKey(),
  stateName: text("state_name").notNull(),
  gstStateCode: text("gst_state_code").notNull(),
});

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  accountType: accountTypeEnum("account_type").notNull(),
  parentAccountId: integer("parent_account_id"),
  isActive: boolean("is_active").default(true).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("uniq_accounts_org_code").on(table.orgId, table.code),
  index("idx_accounts_org_type_active").on(table.orgId, table.accountType, table.isActive),
]);

export const journalEntries = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  entryNumber: text("entry_number").notNull(),
  entryDate: date("entry_date").notNull(),
  description: text("description"),
  sourceType: text("source_type").notNull(),
  sourceId: text("source_id"),
  sourceEvent: text("source_event"),
  status: journalEntryStatusEnum("status").default("POSTED").notNull(),
  createdBy: text("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("uniq_je_org_number").on(table.orgId, table.entryNumber),
  unique("uniq_je_idempotency").on(table.orgId, table.sourceType, table.sourceId, table.sourceEvent),
  index("idx_je_org_date").on(table.orgId, table.entryDate),
  index("idx_je_org_source").on(table.orgId, table.sourceType, table.sourceId),
]);

export const journalLines = pgTable("journal_lines", {
  id: serial("id").primaryKey(),
  entryId: integer("entry_id").references(() => journalEntries.id, { onDelete: "cascade" }).notNull(),
  accountId: integer("account_id").references(() => accounts.id).notNull(),
  debit: decimal("debit", { precision: 18, scale: 4 }).default("0").notNull(),
  credit: decimal("credit", { precision: 18, scale: 4 }).default("0").notNull(),
  description: text("description"),
  lineOrder: integer("line_order").notNull(),
}, (table) => [
  index("idx_jl_entry").on(table.entryId),
  index("idx_jl_account").on(table.accountId),
]);

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  organization: one(organizations, { fields: [accounts.orgId], references: [organizations.id] }),
  parent: one(accounts, { fields: [accounts.parentAccountId], references: [accounts.id], relationName: "accountParent" }),
  children: many(accounts, { relationName: "accountParent" }),
  lines: many(journalLines),
}));

export const journalEntriesRelations = relations(journalEntries, ({ one, many }) => ({
  organization: one(organizations, { fields: [journalEntries.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [journalEntries.createdBy], references: [users.id] }),
  lines: many(journalLines),
}));

export const journalLinesRelations = relations(journalLines, ({ one }) => ({
  entry: one(journalEntries, { fields: [journalLines.entryId], references: [journalEntries.id] }),
  account: one(accounts, { fields: [journalLines.accountId], references: [accounts.id] }),
}));
```

- [ ] **Step 2.2 — Re-export from `lib/db/schema/index.ts`**

Open the file. Add the line `export * from "./accounting";` adjacent to the other re-exports (preserve alphabetical or existing ordering).

- [ ] **Step 2.3 — Generate the migration**

Run: `pnpm exec drizzle-kit generate`
Expected: a new `drizzle/000X_*.sql` containing `accounts`, `journal_entries`, `journal_lines`, `indian_states`, and the two enums.

- [ ] **Step 2.4 — Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: clean. If `serial-only` import or `pgEnum` is missing, fix imports in `accounting.ts`.

- [ ] **Step 2.5 — User reviews; stop here**

---

## Task 3: Invoice GST columns + invoice_items table + clients.gstin

**Files:**
- Modify: `lib/db/schema/crm.ts`

- [ ] **Step 3.1 — Add GST columns to existing `invoices` table**

In `lib/db/schema/crm.ts`, locate the `invoices = pgTable("invoices", { ... })` declaration. Inside the column block, after the existing `terms: text("terms"),` line, add:

```ts
  placeOfSupply: text("place_of_supply"),
  customerGstin: text("customer_gstin"),
  supplierGstin: text("supplier_gstin"),
  reverseCharge: boolean("reverse_charge").default(false).notNull(),
  taxInclusive: boolean("tax_inclusive").default(false).notNull(),
  cgstAmount: decimal("cgst_amount", { precision: 18, scale: 4 }).default("0").notNull(),
  sgstAmount: decimal("sgst_amount", { precision: 18, scale: 4 }).default("0").notNull(),
  igstAmount: decimal("igst_amount", { precision: 18, scale: 4 }).default("0").notNull(),
```

- [ ] **Step 3.2 — Add `invoice_items` table to `crm.ts`**

Immediately after the closing `]);` of the `invoices` pgTable, insert:

```ts
export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").references(() => invoices.id, { onDelete: "cascade" }).notNull(),
  description: text("description").notNull(),
  hsnSacCode: text("hsn_sac_code"),
  quantity: decimal("quantity", { precision: 18, scale: 4 }).notNull(),
  rate: decimal("rate", { precision: 18, scale: 4 }).notNull(),
  gstRate: decimal("gst_rate", { precision: 5, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 18, scale: 4 }).notNull(),
  lineOrder: integer("line_order").notNull(),
}, (table) => [
  index("idx_invoice_items_invoice").on(table.invoiceId),
]);

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceItems.invoiceId], references: [invoices.id] }),
}));
```

- [ ] **Step 3.3 — Extend `invoicesRelations` to include items**

Locate `export const invoicesRelations = relations(invoices, ({ one, many }) => ({`. Add `items: many(invoiceItems),` to the relations object alongside `payments: many(payments)`.

- [ ] **Step 3.4 — Add `gstin` column to `clients` table**

Locate `clients = pgTable("clients", {`. Inside the column block, add:

```ts
  gstin: text("gstin"),
```

Place it near the existing `state` / `address` columns to keep related fields together.

- [ ] **Step 3.5 — Generate migration**

Run: `pnpm exec drizzle-kit generate`
Expected: a new `drizzle/000X_*.sql` adding columns to `invoices`, creating `invoice_items`, and adding `clients.gstin`.

- [ ] **Step 3.6 — Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: clean across all of `crm.ts` and any consumer types — fix only TS errors that come from missing-column issues. Do NOT change call sites yet; the existing `taxRate` and JSONB `line_items` columns are preserved so consumers keep working.

- [ ] **Step 3.7 — User reviews; stop here**

---

## Task 4: COA seed runner (50 Indian-standard accounts)

**Files:**
- Create: `lib/accounting/seed-coa.ts`

- [ ] **Step 4.1 — Create `lib/accounting/seed-coa.ts`**

```ts
import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema/accounting";

type SeedAccount = {
  code: string;
  name: string;
  accountType: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
};

const DEFAULT_COA: ReadonlyArray<SeedAccount> = [
  { code: "1000", name: "Cash", accountType: "ASSET" },
  { code: "1100", name: "Bank Account", accountType: "ASSET" },
  { code: "1200", name: "Accounts Receivable", accountType: "ASSET" },
  { code: "1300", name: "Inventory", accountType: "ASSET" },
  { code: "1400", name: "Prepaid Expenses", accountType: "ASSET" },
  { code: "1410", name: "Input CGST", accountType: "ASSET" },
  { code: "1411", name: "Input SGST", accountType: "ASSET" },
  { code: "1412", name: "Input IGST", accountType: "ASSET" },
  { code: "1500", name: "Fixed Assets", accountType: "ASSET" },
  { code: "1510", name: "Office Equipment", accountType: "ASSET" },
  { code: "1520", name: "Furniture and Fixtures", accountType: "ASSET" },
  { code: "1530", name: "Vehicles", accountType: "ASSET" },
  { code: "1590", name: "Accumulated Depreciation", accountType: "ASSET" },
  { code: "1600", name: "Security Deposits", accountType: "ASSET" },

  { code: "2000", name: "Accounts Payable", accountType: "LIABILITY" },
  { code: "2100", name: "GST Payable", accountType: "LIABILITY" },
  { code: "2110", name: "Output CGST", accountType: "LIABILITY" },
  { code: "2111", name: "Output SGST", accountType: "LIABILITY" },
  { code: "2112", name: "Output IGST", accountType: "LIABILITY" },
  { code: "2200", name: "TDS Payable", accountType: "LIABILITY" },
  { code: "2300", name: "Salary Payable", accountType: "LIABILITY" },
  { code: "2400", name: "Bonus Payable", accountType: "LIABILITY" },
  { code: "2500", name: "Provident Fund Payable", accountType: "LIABILITY" },
  { code: "2600", name: "ESI Payable", accountType: "LIABILITY" },
  { code: "2700", name: "Loans Payable", accountType: "LIABILITY" },

  { code: "3000", name: "Owner's Equity", accountType: "EQUITY" },
  { code: "3100", name: "Retained Earnings", accountType: "EQUITY" },
  { code: "3200", name: "Drawings", accountType: "EQUITY" },

  { code: "4000", name: "Sales Revenue", accountType: "INCOME" },
  { code: "4100", name: "Service Revenue", accountType: "INCOME" },
  { code: "4200", name: "Subscription Revenue", accountType: "INCOME" },
  { code: "4300", name: "Interest Income", accountType: "INCOME" },
  { code: "4900", name: "Other Income", accountType: "INCOME" },

  { code: "5000", name: "Cost of Goods Sold", accountType: "EXPENSE" },
  { code: "5100", name: "Salaries Expense", accountType: "EXPENSE" },
  { code: "5110", name: "Bonus Expense", accountType: "EXPENSE" },
  { code: "5120", name: "PF Contribution Expense", accountType: "EXPENSE" },
  { code: "5200", name: "Rent Expense", accountType: "EXPENSE" },
  { code: "5300", name: "Utilities Expense", accountType: "EXPENSE" },
  { code: "5400", name: "Office Supplies", accountType: "EXPENSE" },
  { code: "5500", name: "Travel Expense", accountType: "EXPENSE" },
  { code: "5600", name: "Marketing Expense", accountType: "EXPENSE" },
  { code: "5700", name: "Professional Fees", accountType: "EXPENSE" },
  { code: "5800", name: "Software Subscriptions", accountType: "EXPENSE" },
  { code: "5850", name: "Internet and Communication", accountType: "EXPENSE" },
  { code: "5900", name: "Depreciation Expense", accountType: "EXPENSE" },
  { code: "5910", name: "Bank Charges", accountType: "EXPENSE" },
  { code: "5920", name: "Interest Expense", accountType: "EXPENSE" },
  { code: "5990", name: "Miscellaneous Expense", accountType: "EXPENSE" },
];

export async function seedChartOfAccountsForOrg(orgId: string): Promise<void> {
  const existing = await db
    .select({ code: accounts.code })
    .from(accounts)
    .where(eq(accounts.orgId, orgId))
    .limit(1);
  if (existing.length > 0) return;

  for (const row of DEFAULT_COA) {
    await db
      .insert(accounts)
      .values({ orgId, code: row.code, name: row.name, accountType: row.accountType })
      .onConflictDoNothing();
  }
}

export async function ensureAccountExists(orgId: string, code: string): Promise<number | null> {
  const found = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.orgId, orgId), eq(accounts.code, code)))
    .limit(1);
  return found[0]?.id ?? null;
}
```

- [ ] **Step 4.2 — Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: clean.

- [ ] **Step 4.3 — User reviews; stop here**

---

## Task 5: Posting rules + GST math (pure)

**Files:**
- Create: `lib/accounting/posting-rules.ts`

- [ ] **Step 5.1 — Create `lib/accounting/posting-rules.ts`**

```ts
export type PostingAccountCode =
  | "1000" | "1100" | "1200"
  | "2110" | "2111" | "2112"
  | "4000" | "4100";

export const ACCOUNT_CODES = {
  cash: "1000",
  bank: "1100",
  accountsReceivable: "1200",
  outputCgst: "2110",
  outputSgst: "2111",
  outputIgst: "2112",
  salesRevenue: "4000",
  serviceRevenue: "4100",
} as const;

export type GstSplit = {
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
};

export type LineForGst = {
  quantity: number;
  rate: number;
  gstRate: number;
};

export type GstContext = {
  supplierStateCode: string;
  placeOfSupplyStateCode: string;
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

export function computeLineAmount(line: LineForGst): number {
  return round2(line.quantity * line.rate);
}

export function computeLineTax(line: LineForGst): number {
  return round2(computeLineAmount(line) * (line.gstRate / 100));
}

export function isIntraState(ctx: GstContext): boolean {
  return ctx.supplierStateCode === ctx.placeOfSupplyStateCode;
}

export function splitTaxPool(taxPool: number, ctx: GstContext): GstSplit {
  if (isIntraState(ctx)) {
    const half = round2(taxPool / 2);
    return { cgst: half, sgst: round2(taxPool - half), igst: 0, total: taxPool };
  }
  return { cgst: 0, sgst: 0, igst: round2(taxPool), total: taxPool };
}

export function paymentMethodToAccountCode(method: string): "1000" | "1100" {
  return method === "cash" ? "1000" : "1100";
}
```

- [ ] **Step 5.2 — Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: clean.

- [ ] **Step 5.3 — User reviews; stop here**

---

## Task 6: Journal entry numbering + persist helper

**Files:**
- Create: `lib/accounting/numbering.ts`
- Create: `lib/accounting/persist-entry.ts`

- [ ] **Step 6.1 — Create `lib/accounting/numbering.ts`**

```ts
import "server-only";
import { and, eq, like, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { journalEntries } from "@/lib/db/schema/accounting";

export async function nextEntryNumber(orgId: string, year: number): Promise<string> {
  const prefix = `JE-${year}-`;
  const latest = await db
    .select({ entryNumber: journalEntries.entryNumber })
    .from(journalEntries)
    .where(and(eq(journalEntries.orgId, orgId), like(journalEntries.entryNumber, `${prefix}%`)))
    .orderBy(desc(journalEntries.entryNumber))
    .limit(1);

  const last = latest[0]?.entryNumber;
  const lastSeq = last ? parseInt(last.slice(prefix.length), 10) : 0;
  const nextSeq = (Number.isFinite(lastSeq) ? lastSeq : 0) + 1;
  return `${prefix}${String(nextSeq).padStart(6, "0")}`;
}
```

- [ ] **Step 6.2 — Create `lib/accounting/persist-entry.ts`**

```ts
import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { accounts, journalEntries, journalLines } from "@/lib/db/schema/accounting";
import { nextEntryNumber } from "./numbering";

export type DraftLine = {
  accountCode: string;
  debit: number;
  credit: number;
  description?: string | null;
};

export type DraftEntry = {
  orgId: string;
  entryDate: string;
  description?: string | null;
  sourceType: string;
  sourceId: string | null;
  sourceEvent: string | null;
  createdBy: string;
  lines: DraftLine[];
};

function assertBalanced(lines: DraftLine[]): void {
  const debit = lines.reduce((acc, l) => acc + l.debit, 0);
  const credit = lines.reduce((acc, l) => acc + l.credit, 0);
  const diff = Math.abs(Math.round((debit - credit) * 100) / 100);
  if (diff > 0.009) {
    throw new Error(`Unbalanced journal entry: debit=${debit} credit=${credit} diff=${diff}`);
  }
  for (const line of lines) {
    if (line.debit < 0 || line.credit < 0) {
      throw new Error(`Negative amount in journal line: ${JSON.stringify(line)}`);
    }
    if ((line.debit > 0 && line.credit > 0) || (line.debit === 0 && line.credit === 0)) {
      throw new Error(`Journal line must have exactly one of debit or credit > 0: ${JSON.stringify(line)}`);
    }
  }
}

export type PersistedEntry = {
  id: number;
  entryNumber: string;
};

export async function persistJournalEntry(draft: DraftEntry): Promise<PersistedEntry> {
  assertBalanced(draft.lines);

  if (draft.sourceId !== null && draft.sourceEvent !== null) {
    const existing = await db
      .select({ id: journalEntries.id, entryNumber: journalEntries.entryNumber })
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.orgId, draft.orgId),
          eq(journalEntries.sourceType, draft.sourceType),
          eq(journalEntries.sourceId, draft.sourceId),
          eq(journalEntries.sourceEvent, draft.sourceEvent),
        ),
      )
      .limit(1);
    if (existing[0]) return existing[0];
  }

  const year = new Date(draft.entryDate).getUTCFullYear();
  const codeToId = new Map<string, number>();
  const distinctCodes = Array.from(new Set(draft.lines.map((l) => l.accountCode)));
  const rows = await db
    .select({ id: accounts.id, code: accounts.code })
    .from(accounts)
    .where(eq(accounts.orgId, draft.orgId));
  for (const row of rows) codeToId.set(row.code, row.id);

  for (const code of distinctCodes) {
    if (!codeToId.has(code)) {
      throw new Error(`Account code ${code} not found for org ${draft.orgId}. Seed COA first.`);
    }
  }

  const maxAttempts = 5;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const entryNumber = await nextEntryNumber(draft.orgId, year);
    try {
      const inserted = await db
        .insert(journalEntries)
        .values({
          orgId: draft.orgId,
          entryNumber,
          entryDate: draft.entryDate,
          description: draft.description ?? null,
          sourceType: draft.sourceType,
          sourceId: draft.sourceId,
          sourceEvent: draft.sourceEvent,
          createdBy: draft.createdBy,
        })
        .returning({ id: journalEntries.id, entryNumber: journalEntries.entryNumber });

      const entry = inserted[0];
      if (!entry) throw new Error("Insert journal entry returned no rows");

      const lineRows = draft.lines.map((line, idx) => ({
        entryId: entry.id,
        accountId: codeToId.get(line.accountCode)!,
        debit: line.debit.toFixed(4),
        credit: line.credit.toFixed(4),
        description: line.description ?? null,
        lineOrder: idx,
      }));
      await db.insert(journalLines).values(lineRows);

      return entry;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isUniqueViolation = message.includes("uniq_je_org_number") || message.includes("23505");
      if (!isUniqueViolation || attempt === maxAttempts - 1) throw err;
    }
  }
  throw new Error(`Failed to allocate journal entry number after ${maxAttempts} attempts`);
}
```

- [ ] **Step 6.3 — Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: clean.

- [ ] **Step 6.4 — User reviews; stop here**

---

## Task 7: post-invoice and post-payment helpers

**Files:**
- Create: `lib/accounting/post-invoice.ts`
- Create: `lib/accounting/post-payment.ts`

- [ ] **Step 7.1 — Create `lib/accounting/post-invoice.ts`**

```ts
import "server-only";
import { ACCOUNT_CODES, splitTaxPool } from "./posting-rules";
import { persistJournalEntry, type DraftLine, type PersistedEntry } from "./persist-entry";

export type PostInvoiceInput = {
  orgId: string;
  invoiceId: number;
  invoiceNumber: string;
  invoiceDate: string;
  supplierStateCode: string;
  placeOfSupplyStateCode: string;
  subtotal: number;
  discount: number;
  taxPool: number;
  total: number;
  createdBy: string;
};

export async function postInvoiceSend(input: PostInvoiceInput): Promise<PersistedEntry> {
  const split = splitTaxPool(input.taxPool, {
    supplierStateCode: input.supplierStateCode,
    placeOfSupplyStateCode: input.placeOfSupplyStateCode,
  });

  const lines: DraftLine[] = [
    { accountCode: ACCOUNT_CODES.accountsReceivable, debit: input.total, credit: 0, description: `Invoice ${input.invoiceNumber}` },
    { accountCode: ACCOUNT_CODES.salesRevenue, debit: 0, credit: Math.max(0, input.subtotal - input.discount), description: `Invoice ${input.invoiceNumber}` },
  ];
  if (split.cgst > 0) lines.push({ accountCode: ACCOUNT_CODES.outputCgst, debit: 0, credit: split.cgst, description: `Invoice ${input.invoiceNumber} CGST` });
  if (split.sgst > 0) lines.push({ accountCode: ACCOUNT_CODES.outputSgst, debit: 0, credit: split.sgst, description: `Invoice ${input.invoiceNumber} SGST` });
  if (split.igst > 0) lines.push({ accountCode: ACCOUNT_CODES.outputIgst, debit: 0, credit: split.igst, description: `Invoice ${input.invoiceNumber} IGST` });

  return persistJournalEntry({
    orgId: input.orgId,
    entryDate: input.invoiceDate,
    description: `Invoice ${input.invoiceNumber} sent`,
    sourceType: "invoice",
    sourceId: String(input.invoiceId),
    sourceEvent: "send",
    createdBy: input.createdBy,
    lines,
  });
}
```

- [ ] **Step 7.2 — Create `lib/accounting/post-payment.ts`**

```ts
import "server-only";
import { ACCOUNT_CODES, paymentMethodToAccountCode } from "./posting-rules";
import { persistJournalEntry, type DraftLine, type PersistedEntry } from "./persist-entry";

export type PostPaymentInput = {
  orgId: string;
  paymentId: number;
  invoiceNumber: string;
  paymentDate: string;
  paymentMethod: string;
  amount: number;
  createdBy: string;
};

export async function postPaymentReceipt(input: PostPaymentInput): Promise<PersistedEntry> {
  const cashCode = paymentMethodToAccountCode(input.paymentMethod);
  const lines: DraftLine[] = [
    { accountCode: cashCode, debit: input.amount, credit: 0, description: `Payment for ${input.invoiceNumber} (${input.paymentMethod})` },
    { accountCode: ACCOUNT_CODES.accountsReceivable, debit: 0, credit: input.amount, description: `Payment for ${input.invoiceNumber}` },
  ];

  return persistJournalEntry({
    orgId: input.orgId,
    entryDate: input.paymentDate,
    description: `Payment received for ${input.invoiceNumber}`,
    sourceType: "payment",
    sourceId: String(input.paymentId),
    sourceEvent: "receipt",
    createdBy: input.createdBy,
    lines,
  });
}
```

- [ ] **Step 7.3 — Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: clean.

- [ ] **Step 7.4 — User reviews; stop here**

---

## Task 8: Validation schemas + cache tags + types

**Files:**
- Create: `lib/validation/accounting-schemas.ts`
- Modify: `lib/validation/index.ts`
- Modify: `lib/api/cache-tags.ts`
- Create: `types/accounting.ts`

- [ ] **Step 8.1 — Create `lib/validation/accounting-schemas.ts`**

```ts
import { z } from "zod";
import { paginationSchema, dateRangeSchema, searchSchema } from "./common-schemas";

export const accountTypeSchema = z.enum(["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"]);

export const listAccountsQuerySchema = paginationSchema
  .merge(searchSchema)
  .extend({ type: accountTypeSchema.optional(), activeOnly: z.coerce.boolean().optional() });

export const createAccountSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(120),
  accountType: accountTypeSchema,
  parentAccountId: z.number().int().positive().optional(),
  description: z.string().max(500).optional(),
});

export const updateAccountSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  isActive: z.boolean().optional(),
  description: z.string().max(500).optional(),
});

export const listJournalQuerySchema = paginationSchema
  .merge(dateRangeSchema)
  .extend({ sourceType: z.string().max(40).optional() });

export const trialBalanceQuerySchema = z.object({
  asOf: z.string().date(),
});

export const profitLossQuerySchema = dateRangeSchema;
```

- [ ] **Step 8.2 — Re-export from `lib/validation/index.ts`**

Append `export * from "./accounting-schemas";` after the existing re-exports.

- [ ] **Step 8.3 — Extend `lib/api/cache-tags.ts`**

Open the file. In the `CacheTag` exported const/enum, add:

```ts
  accounts: "accounts",
  journal: "journal",
  trialBalance: "trial-balance",
  profitLoss: "profit-loss",
```

Match the existing key style (string vs symbol).

- [ ] **Step 8.4 — Create `types/accounting.ts`**

```ts
export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";

export interface Account {
  id: number;
  orgId: string;
  code: string;
  name: string;
  accountType: AccountType;
  parentAccountId: number | null;
  isActive: boolean;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface JournalLine {
  id: number;
  entryId: number;
  accountId: number;
  accountCode: string;
  accountName: string;
  debit: string;
  credit: string;
  description: string | null;
  lineOrder: number;
}

export type JournalEntryStatus = "DRAFT" | "POSTED" | "VOID";

export interface JournalEntry {
  id: number;
  orgId: string;
  entryNumber: string;
  entryDate: string;
  description: string | null;
  sourceType: string;
  sourceId: string | null;
  sourceEvent: string | null;
  status: JournalEntryStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lines?: JournalLine[];
}

export interface TrialBalanceRow {
  accountId: number;
  code: string;
  name: string;
  accountType: AccountType;
  debit: string;
  credit: string;
  balance: string;
}

export interface ProfitLossRow {
  accountId: number;
  code: string;
  name: string;
  accountType: "INCOME" | "EXPENSE";
  amount: string;
}

export interface ProfitLossReport {
  from: string;
  to: string;
  income: ProfitLossRow[];
  expense: ProfitLossRow[];
  netIncome: string;
}
```

- [ ] **Step 8.5 — Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: clean.

- [ ] **Step 8.6 — User reviews; stop here**

---

## Task 9: Accounts API routes

**Files:**
- Create: `app/api/accounting/accounts/route.ts`
- Create: `app/api/accounting/accounts/[accountId]/route.ts`

- [ ] **Step 9.1 — Create `app/api/accounting/accounts/route.ts`**

```ts
import { and, asc, count, eq, ilike } from "drizzle-orm";
import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema/accounting";
import { withRoles, parseQuery, parseBody, ok, err } from "@/lib/api/helpers";
import { listAccountsQuerySchema, createAccountSchema } from "@/lib/validation/accounting-schemas";
import { CacheTag, orgScopedTag } from "@/lib/api/cache-tags";
import { paginateOffset, buildListResponse } from "@/lib/api/list-response";
import { seedChartOfAccountsForOrg } from "@/lib/accounting/seed-coa";

export const GET = withRoles(["OWNER", "CEO", "HR"], async (req, session) => {
  const parsed = parseQuery(req, listAccountsQuerySchema);
  if (!parsed.success) return err(parsed.error, 400);
  const { page, pageSize, search, type, activeOnly } = parsed.data;

  await seedChartOfAccountsForOrg(session.user.orgId);

  const tag = orgScopedTag(CacheTag.accounts, session.user.orgId);
  const fetcher = unstable_cache(
    async () => {
      const conds = [eq(accounts.orgId, session.user.orgId)];
      if (type) conds.push(eq(accounts.accountType, type));
      if (activeOnly) conds.push(eq(accounts.isActive, true));
      if (search) conds.push(ilike(accounts.name, `%${search.replaceAll("%", "\\%")}%`));

      const { offset, limit } = paginateOffset({ page, pageSize });
      const items = await db
        .select()
        .from(accounts)
        .where(and(...conds))
        .orderBy(asc(accounts.code))
        .offset(offset)
        .limit(limit);
      const totalRows = await db.select({ c: count() }).from(accounts).where(and(...conds));
      return buildListResponse(items, totalRows[0].c, { page, pageSize });
    },
    [tag, `accounts:${page}:${pageSize}:${search ?? ""}:${type ?? ""}:${activeOnly ?? ""}`],
    { tags: [tag], revalidate: 300 },
  );

  return ok(await fetcher());
});

export const POST = withRoles(["OWNER", "CEO"], async (req, session) => {
  const parsed = await parseBody(req, createAccountSchema);
  if (!parsed.success) return err(parsed.error, 400);

  const existing = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.orgId, session.user.orgId), eq(accounts.code, parsed.data.code)))
    .limit(1);
  if (existing.length > 0) return err("Account code already exists", 409);

  const inserted = await db
    .insert(accounts)
    .values({ ...parsed.data, orgId: session.user.orgId })
    .returning();

  revalidateTag(orgScopedTag(CacheTag.accounts, session.user.orgId));
  return ok(inserted[0], 201);
});
```

- [ ] **Step 9.2 — Create `app/api/accounting/accounts/[accountId]/route.ts`**

```ts
import { and, eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema/accounting";
import { withRoles, parseBody, ok, err } from "@/lib/api/helpers";
import { updateAccountSchema } from "@/lib/validation/accounting-schemas";
import { CacheTag, orgScopedTag } from "@/lib/api/cache-tags";

type RouteCtx = { params: Promise<{ accountId: string }> };

export const PATCH = withRoles(["OWNER", "CEO"], async (req: Request, session, ctx: RouteCtx) => {
  const { accountId } = await ctx.params;
  const id = Number(accountId);
  if (!Number.isInteger(id) || id <= 0) return err("Invalid account id", 400);

  const parsed = await parseBody(req, updateAccountSchema);
  if (!parsed.success) return err(parsed.error, 400);

  const updated = await db
    .update(accounts)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(accounts.id, id), eq(accounts.orgId, session.user.orgId)))
    .returning();
  if (updated.length === 0) return err("Account not found", 404);

  revalidateTag(orgScopedTag(CacheTag.accounts, session.user.orgId));
  return ok(updated[0]);
});
```

- [ ] **Step 9.3 — Verify `withRoles`, `parseQuery`, `parseBody`, `ok`, `err`, and the cache-tag helpers signatures match**

Open `lib/api/helpers.ts` and confirm:
- `withRoles(allowedRoles, handler)` exists and the handler is called with `(req, session, ctx?)`
- `parseQuery(req, schema)` returns `{ success, data, error }`
- `parseBody(req, schema)` returns `{ success, data, error }` and is async
- `ok(payload, status?)` and `err(message, status)` return `Response`

Open `lib/api/cache-tags.ts` and confirm:
- `CacheTag` constant has the keys `accounts`, `journal`, `trialBalance`, `profitLoss` (added in Task 8)
- `orgScopedTag(tag, orgId)` exists

If any signature differs, adjust the route code in 9.1/9.2 to match — do not change helpers.

- [ ] **Step 9.4 — Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: clean.

- [ ] **Step 9.5 — User reviews; stop here**

---

## Task 10: Journal API routes

**Files:**
- Create: `app/api/accounting/journal/route.ts`
- Create: `app/api/accounting/journal/[entryId]/route.ts`

- [ ] **Step 10.1 — Create `app/api/accounting/journal/route.ts`**

```ts
import { and, asc, count, desc, eq, gte, lte } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { journalEntries } from "@/lib/db/schema/accounting";
import { withRoles, parseQuery, ok, err } from "@/lib/api/helpers";
import { listJournalQuerySchema } from "@/lib/validation/accounting-schemas";
import { CacheTag, orgScopedTag } from "@/lib/api/cache-tags";
import { paginateOffset, buildListResponse } from "@/lib/api/list-response";

export const GET = withRoles(["OWNER", "CEO", "HR"], async (req, session) => {
  const parsed = parseQuery(req, listJournalQuerySchema);
  if (!parsed.success) return err(parsed.error, 400);
  const { page, pageSize, from, to, sourceType } = parsed.data;

  const tag = orgScopedTag(CacheTag.journal, session.user.orgId);
  const fetcher = unstable_cache(
    async () => {
      const conds = [eq(journalEntries.orgId, session.user.orgId)];
      if (from) conds.push(gte(journalEntries.entryDate, from));
      if (to) conds.push(lte(journalEntries.entryDate, to));
      if (sourceType) conds.push(eq(journalEntries.sourceType, sourceType));

      const { offset, limit } = paginateOffset({ page, pageSize });
      const items = await db
        .select()
        .from(journalEntries)
        .where(and(...conds))
        .orderBy(desc(journalEntries.entryDate), asc(journalEntries.id))
        .offset(offset)
        .limit(limit);
      const totalRows = await db.select({ c: count() }).from(journalEntries).where(and(...conds));
      return buildListResponse(items, totalRows[0].c, { page, pageSize });
    },
    [tag, `journal:${page}:${pageSize}:${from ?? ""}:${to ?? ""}:${sourceType ?? ""}`],
    { tags: [tag], revalidate: 60 },
  );

  return ok(await fetcher());
});
```

- [ ] **Step 10.2 — Create `app/api/accounting/journal/[entryId]/route.ts`**

```ts
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { accounts, journalEntries, journalLines } from "@/lib/db/schema/accounting";
import { withRoles, ok, err } from "@/lib/api/helpers";

type RouteCtx = { params: Promise<{ entryId: string }> };

export const GET = withRoles(["OWNER", "CEO", "HR"], async (_req: Request, session, ctx: RouteCtx) => {
  const { entryId } = await ctx.params;
  const id = Number(entryId);
  if (!Number.isInteger(id) || id <= 0) return err("Invalid entry id", 400);

  const headerRows = await db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.id, id), eq(journalEntries.orgId, session.user.orgId)))
    .limit(1);
  if (headerRows.length === 0) return err("Journal entry not found", 404);

  const lineRows = await db
    .select({
      id: journalLines.id,
      entryId: journalLines.entryId,
      accountId: journalLines.accountId,
      debit: journalLines.debit,
      credit: journalLines.credit,
      description: journalLines.description,
      lineOrder: journalLines.lineOrder,
      accountCode: accounts.code,
      accountName: accounts.name,
    })
    .from(journalLines)
    .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
    .where(eq(journalLines.entryId, id))
    .orderBy(asc(journalLines.lineOrder));

  return ok({ ...headerRows[0], lines: lineRows });
});
```

- [ ] **Step 10.3 — Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: clean.

- [ ] **Step 10.4 — User reviews; stop here**

---

## Task 11: Reports API routes (Trial Balance + P&L)

**Files:**
- Create: `app/api/accounting/reports/trial-balance/route.ts`
- Create: `app/api/accounting/reports/profit-loss/route.ts`

- [ ] **Step 11.1 — Create `app/api/accounting/reports/trial-balance/route.ts`**

```ts
import { and, eq, lte, sum } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { accounts, journalEntries, journalLines } from "@/lib/db/schema/accounting";
import { withRoles, parseQuery, ok, err } from "@/lib/api/helpers";
import { trialBalanceQuerySchema } from "@/lib/validation/accounting-schemas";
import { CacheTag, orgScopedTag } from "@/lib/api/cache-tags";

const NORMAL_DEBIT: ReadonlyArray<string> = ["ASSET", "EXPENSE"];

export const GET = withRoles(["OWNER", "CEO", "HR"], async (req, session) => {
  const parsed = parseQuery(req, trialBalanceQuerySchema);
  if (!parsed.success) return err(parsed.error, 400);
  const { asOf } = parsed.data;

  const tag = orgScopedTag(CacheTag.trialBalance, session.user.orgId);
  const fetcher = unstable_cache(
    async () => {
      const rows = await db
        .select({
          accountId: accounts.id,
          code: accounts.code,
          name: accounts.name,
          accountType: accounts.accountType,
          debit: sum(journalLines.debit),
          credit: sum(journalLines.credit),
        })
        .from(accounts)
        .leftJoin(journalLines, eq(journalLines.accountId, accounts.id))
        .leftJoin(journalEntries, eq(journalEntries.id, journalLines.entryId))
        .where(
          and(
            eq(accounts.orgId, session.user.orgId),
            lte(journalEntries.entryDate, asOf),
            eq(journalEntries.status, "POSTED"),
          ),
        )
        .groupBy(accounts.id, accounts.code, accounts.name, accounts.accountType);

      const tb = rows.map((r) => {
        const debit = Number(r.debit ?? 0);
        const credit = Number(r.credit ?? 0);
        const normalDebit = NORMAL_DEBIT.includes(r.accountType);
        const balance = normalDebit ? debit - credit : credit - debit;
        return {
          accountId: r.accountId,
          code: r.code,
          name: r.name,
          accountType: r.accountType,
          debit: debit.toFixed(2),
          credit: credit.toFixed(2),
          balance: balance.toFixed(2),
        };
      });

      const totalDebit = tb.reduce((acc, r) => acc + Number(r.debit), 0);
      const totalCredit = tb.reduce((acc, r) => acc + Number(r.credit), 0);

      return {
        asOf,
        rows: tb.sort((a, b) => a.code.localeCompare(b.code)),
        totalDebit: totalDebit.toFixed(2),
        totalCredit: totalCredit.toFixed(2),
        balanced: Math.abs(totalDebit - totalCredit) < 0.01,
      };
    },
    [tag, `tb:${asOf}`],
    { tags: [tag], revalidate: 60 },
  );

  return ok(await fetcher());
});
```

- [ ] **Step 11.2 — Create `app/api/accounting/reports/profit-loss/route.ts`**

```ts
import { and, eq, gte, inArray, lte, sum } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { accounts, journalEntries, journalLines } from "@/lib/db/schema/accounting";
import { withRoles, parseQuery, ok, err } from "@/lib/api/helpers";
import { profitLossQuerySchema } from "@/lib/validation/accounting-schemas";
import { CacheTag, orgScopedTag } from "@/lib/api/cache-tags";

export const GET = withRoles(["OWNER", "CEO", "HR"], async (req, session) => {
  const parsed = parseQuery(req, profitLossQuerySchema);
  if (!parsed.success) return err(parsed.error, 400);
  const { from, to } = parsed.data;
  if (!from || !to) return err("from and to are required", 400);

  const tag = orgScopedTag(CacheTag.profitLoss, session.user.orgId);
  const fetcher = unstable_cache(
    async () => {
      const rows = await db
        .select({
          accountId: accounts.id,
          code: accounts.code,
          name: accounts.name,
          accountType: accounts.accountType,
          debit: sum(journalLines.debit),
          credit: sum(journalLines.credit),
        })
        .from(accounts)
        .innerJoin(journalLines, eq(journalLines.accountId, accounts.id))
        .innerJoin(journalEntries, eq(journalEntries.id, journalLines.entryId))
        .where(
          and(
            eq(accounts.orgId, session.user.orgId),
            inArray(accounts.accountType, ["INCOME", "EXPENSE"]),
            gte(journalEntries.entryDate, from),
            lte(journalEntries.entryDate, to),
            eq(journalEntries.status, "POSTED"),
          ),
        )
        .groupBy(accounts.id, accounts.code, accounts.name, accounts.accountType);

      const income = rows
        .filter((r) => r.accountType === "INCOME")
        .map((r) => ({
          accountId: r.accountId,
          code: r.code,
          name: r.name,
          accountType: "INCOME" as const,
          amount: (Number(r.credit ?? 0) - Number(r.debit ?? 0)).toFixed(2),
        }))
        .sort((a, b) => a.code.localeCompare(b.code));
      const expense = rows
        .filter((r) => r.accountType === "EXPENSE")
        .map((r) => ({
          accountId: r.accountId,
          code: r.code,
          name: r.name,
          accountType: "EXPENSE" as const,
          amount: (Number(r.debit ?? 0) - Number(r.credit ?? 0)).toFixed(2),
        }))
        .sort((a, b) => a.code.localeCompare(b.code));

      const totalIncome = income.reduce((acc, r) => acc + Number(r.amount), 0);
      const totalExpense = expense.reduce((acc, r) => acc + Number(r.amount), 0);
      const netIncome = (totalIncome - totalExpense).toFixed(2);

      return { from, to, income, expense, totalIncome: totalIncome.toFixed(2), totalExpense: totalExpense.toFixed(2), netIncome };
    },
    [tag, `pnl:${from}:${to}`],
    { tags: [tag], revalidate: 60 },
  );

  return ok(await fetcher());
});
```

- [ ] **Step 11.3 — Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: clean.

- [ ] **Step 11.4 — User reviews; stop here**

---

## Task 12: Wire posting into invoice + payment routes

**Files:**
- Modify: `app/api/invoices/route.ts`
- Modify: `app/api/invoices/[invoiceId]/route.ts`
- Modify: `app/api/payments/route.ts`

Read the actual existing handlers first. Their exact transaction shape will dictate the integration. The high-level pattern below applies; adapt the surrounding code without changing existing behavior other than adding GST fields and post calls.

- [ ] **Step 12.1 — Read existing handlers**

```bash
cat app/api/invoices/route.ts
cat 'app/api/invoices/[invoiceId]/route.ts'
cat app/api/payments/route.ts
```

Note the existing zod schemas, the transaction structure, and how `orgId` / `createdBy` are sourced.

- [ ] **Step 12.2 — Extend invoice create zod**

In `app/api/invoices/route.ts`, extend the create-invoice zod schema to accept (all optional, with defaults):

```ts
placeOfSupply: z.string().regex(/^\d{2}$/).optional(),
customerGstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).optional(),
supplierGstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).optional(),
reverseCharge: z.boolean().optional(),
taxInclusive: z.boolean().optional(),
items: z.array(z.object({
  description: z.string().min(1),
  hsnSacCode: z.string().optional(),
  quantity: z.number().positive(),
  rate: z.number().nonnegative(),
  gstRate: z.number().refine((v) => [0, 5, 12, 18, 28].includes(v), "gstRate must be 0/5/12/18/28"),
})).min(1),
```

Replace the legacy `lineItems` zod with the new `items` schema. If callers still send legacy `lineItems`, coerce them in a fallback before validation: map `{description, quantity, rate, amount}` → `{description, quantity, rate, gstRate: 0}`.

- [ ] **Step 12.3 — Compute GST inside the create handler**

Inside the transaction that inserts the invoice header:
1. For each item, compute `amount = round2(quantity * rate)` and `tax = round2(amount * gstRate/100)`.
2. Compute `subtotal = sum(amount)` and `taxPool = sum(tax)`.
3. Resolve `placeOfSupply`: explicit → client.state → org.address.state.
4. Resolve `supplierStateCode` from `organizations.address.state` (look up state code from `indianStates` by `stateName`).
5. Call `splitTaxPool(taxPool, ctx)` from `lib/accounting/posting-rules` to get `{cgst, sgst, igst}`.
6. Compute `total = subtotal + taxPool - (discount ?? 0)`.
7. Write `cgst_amount`, `sgst_amount`, `igst_amount`, `subtotal`, `tax_amount = taxPool`, `total` to the new columns.
8. Insert one `invoice_items` row per item with `amount` (pre-tax) and `gstRate`.
9. Keep populating the legacy `lineItems` JSONB for one release (mirror data) — write the same items with `amount` only.
10. If status === "SENT", call `postInvoiceSend({ ... })` inside the same transaction. Roll back if it throws.

- [ ] **Step 12.4 — Add same GST handling to `app/api/invoices/[invoiceId]/route.ts` PATCH**

When `status` transitions from non-SENT to "SENT", call `postInvoiceSend`. When status changes back to DRAFT or CANCELLED, do NOT auto-reverse in this session (Session 2 work). Document this in a one-line comment on the handler.

- [ ] **Step 12.5 — Modify `app/api/payments/route.ts` POST**

After inserting the payment row inside its existing transaction, look up the invoice number for the payment's invoice, then call `postPaymentReceipt({ orgId, paymentId, invoiceNumber, paymentDate, paymentMethod, amount, createdBy })`. Roll back on throw.

- [ ] **Step 12.6 — Invalidate caches on each posting**

After a successful post, in the same handler:

```ts
revalidateTag(orgScopedTag(CacheTag.journal, session.user.orgId));
revalidateTag(orgScopedTag(CacheTag.trialBalance, session.user.orgId));
revalidateTag(orgScopedTag(CacheTag.profitLoss, session.user.orgId));
```

- [ ] **Step 12.7 — Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: clean.

- [ ] **Step 12.8 — User reviews; stop here**

---

## Task 13: TanStack Query hooks

**Files:**
- Create: `lib/api/hooks/accounting.ts`

- [ ] **Step 13.1 — Create `lib/api/hooks/accounting.ts`**

```ts
"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Account, JournalEntry, TrialBalanceRow, ProfitLossReport } from "@/types/accounting";

const QK = {
  accounts: (params: Record<string, unknown>) => ["accounts", params] as const,
  journal: (params: Record<string, unknown>) => ["journal", params] as const,
  journalEntry: (id: number) => ["journal-entry", id] as const,
  trialBalance: (asOf: string) => ["trial-balance", asOf] as const,
  profitLoss: (from: string, to: string) => ["profit-loss", from, to] as const,
};

type ListResp<T> = { items: T[]; total: number; page: number; pageSize: number; totalPages: number };

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: "include" });
  if (!res.ok) throw new Error((await res.text()) || res.statusText);
  return (await res.json()) as T;
}

async function send<T>(path: string, method: "POST" | "PATCH", body: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.text()) || res.statusText);
  return (await res.json()) as T;
}

export type ListAccountsParams = { page?: number; pageSize?: number; search?: string; type?: Account["accountType"]; activeOnly?: boolean };

export function useAccounts(params: ListAccountsParams = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, String(v));
  return useQuery({
    queryKey: QK.accounts(params),
    queryFn: () => get<ListResp<Account>>(`/api/accounting/accounts?${qs.toString()}`),
    staleTime: 60_000,
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { code: string; name: string; accountType: Account["accountType"]; description?: string }) =>
      send<Account>("/api/accounting/accounts", "POST", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
  });
}

export function useUpdateAccount(accountId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name?: string; isActive?: boolean; description?: string }) =>
      send<Account>(`/api/accounting/accounts/${accountId}`, "PATCH", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
  });
}

export type ListJournalParams = { page?: number; pageSize?: number; from?: string; to?: string; sourceType?: string };

export function useJournal(params: ListJournalParams = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, String(v));
  return useQuery({
    queryKey: QK.journal(params),
    queryFn: () => get<ListResp<JournalEntry>>(`/api/accounting/journal?${qs.toString()}`),
    staleTime: 30_000,
  });
}

export function useJournalEntry(entryId: number) {
  return useQuery({
    queryKey: QK.journalEntry(entryId),
    queryFn: () => get<JournalEntry>(`/api/accounting/journal/${entryId}`),
    enabled: Number.isInteger(entryId) && entryId > 0,
  });
}

export function useTrialBalance(asOf: string) {
  return useQuery({
    queryKey: QK.trialBalance(asOf),
    queryFn: () => get<{ asOf: string; rows: TrialBalanceRow[]; totalDebit: string; totalCredit: string; balanced: boolean }>(
      `/api/accounting/reports/trial-balance?asOf=${asOf}`,
    ),
    enabled: !!asOf,
    staleTime: 30_000,
  });
}

export function useProfitLoss(from: string, to: string) {
  return useQuery({
    queryKey: QK.profitLoss(from, to),
    queryFn: () => get<ProfitLossReport>(`/api/accounting/reports/profit-loss?from=${from}&to=${to}`),
    enabled: !!from && !!to,
    staleTime: 30_000,
  });
}
```

- [ ] **Step 13.2 — Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: clean.

- [ ] **Step 13.3 — User reviews; stop here**

---

## Task 14: Accounting layout + hub page

**Files:**
- Create: `app/(dashboard)/accounting/layout.tsx`
- Create: `app/(dashboard)/accounting/page.tsx`

- [ ] **Step 14.1 — Create `app/(dashboard)/accounting/layout.tsx`**

```tsx
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const ACCOUNTING_ROLES = ["OWNER", "CEO", "HR"] as const;

export default async function AccountingLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const role = session?.user?.role;
  if (!role || !ACCOUNTING_ROLES.includes(role as typeof ACCOUNTING_ROLES[number])) {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
```

If the existing dashboard segment already has an auth check, this redundancy is fine — defense in depth.

- [ ] **Step 14.2 — Create `app/(dashboard)/accounting/page.tsx`**

```tsx
"use client";
import Link from "next/link";
import { Calculator, BookOpen, ScrollText, BarChart3 } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { useAccounts, useJournal, useTrialBalance } from "@/lib/api/hooks/accounting";
import { DS } from "@/lib/design-system";

const today = () => new Date().toISOString().slice(0, 10);

export default function AccountingHubPage() {
  const accounts = useAccounts({ page: 1, pageSize: 1 });
  const journal = useJournal({ page: 1, pageSize: 1 });
  const tb = useTrialBalance(today());

  return (
    <PageWrapper
      eyebrow="Finance · Accounting"
      title="Accounting"
      description="Chart of accounts, journal entries, and Indian-GST-aware reports."
    >
      <div className={DS.gridResponsive4}>
        <StatCard label="Accounts" value={String(accounts.data?.total ?? 0)} icon={<BookOpen className="size-5" />} />
        <StatCard label="Journal entries" value={String(journal.data?.total ?? 0)} icon={<ScrollText className="size-5" />} />
        <StatCard
          label="Trial balance"
          value={tb.data?.balanced ? "Balanced" : "Imbalanced"}
          icon={<BarChart3 className="size-5" />}
          tone={tb.data?.balanced ? "neutral" : "danger"}
        />
        <StatCard label="GST mode" value="Indian SMB" icon={<Calculator className="size-5" />} />
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/accounting/coa" className="block"><Card className="p-6 hover:border-blue-500/40"><div className="font-medium">Chart of Accounts</div><div className="text-sm text-slate-600 mt-1">Manage accounts and groupings</div></Card></Link>
        <Link href="/accounting/journal" className="block"><Card className="p-6 hover:border-blue-500/40"><div className="font-medium">Journal</div><div className="text-sm text-slate-600 mt-1">View posted entries</div></Card></Link>
        <Link href="/accounting/reports/trial-balance" className="block"><Card className="p-6 hover:border-blue-500/40"><div className="font-medium">Trial Balance</div><div className="text-sm text-slate-600 mt-1">As-of-date summary</div></Card></Link>
        <Link href="/accounting/reports/profit-loss" className="block"><Card className="p-6 hover:border-blue-500/40"><div className="font-medium">Profit &amp; Loss</div><div className="text-sm text-slate-600 mt-1">Income and expense</div></Card></Link>
      </div>
    </PageWrapper>
  );
}
```

- [ ] **Step 14.3 — Verify `StatCard` accepts a `tone` prop. If not, drop the `tone={...}` line and rely on the default.**

Open `components/ui/stat-card.tsx`. If `tone` isn't a prop, remove that one line. Do not add the prop here — the `StatCard` API is shared with 20+ consumers.

- [ ] **Step 14.4 — Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: clean.

- [ ] **Step 14.5 — User reviews; stop here**

---

## Task 15: Chart of Accounts pages

**Files:**
- Create: `app/(dashboard)/accounting/coa/page.tsx`
- Create: `app/(dashboard)/accounting/coa/[accountId]/page.tsx`

- [ ] **Step 15.1 — Create `app/(dashboard)/accounting/coa/page.tsx`**

```tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ListToolbar } from "@/components/shared";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAccounts } from "@/lib/api/hooks/accounting";
import { CreateAccountSheet } from "@/features/accounting/create-account-sheet";
import type { AccountType } from "@/types/accounting";

const TYPES: ReadonlyArray<{ key: "ALL" | AccountType; label: string }> = [
  { key: "ALL", label: "All" },
  { key: "ASSET", label: "Assets" },
  { key: "LIABILITY", label: "Liabilities" },
  { key: "EQUITY", label: "Equity" },
  { key: "INCOME", label: "Income" },
  { key: "EXPENSE", label: "Expense" },
];

export default function ChartOfAccountsPage() {
  const [tab, setTab] = useState<"ALL" | AccountType>("ALL");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const query = useAccounts({
    page: 1,
    pageSize: 100,
    search: search || undefined,
    type: tab === "ALL" ? undefined : tab,
  });

  return (
    <PageWrapper
      eyebrow="Accounting"
      title="Chart of Accounts"
      description="The list of all ledger accounts for your organization."
      actions={<Button onClick={() => setCreateOpen(true)}><Plus className="size-4 mr-1" />New account</Button>}
    >
      <Tabs value={tab} onValueChange={(v) => setTab(v as "ALL" | AccountType)} className="w-full">
        <TabsList>
          {TYPES.map((t) => <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      <div className="mt-4">
        <ListToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by name or code..."
        />
      </div>

      <div className="mt-4 rounded-lg border border-slate-200/70 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.data?.items.map((acct) => (
              <TableRow key={acct.id}>
                <TableCell className="font-mono">{acct.code}</TableCell>
                <TableCell><Link href={`/accounting/coa/${acct.id}`} className="text-blue-600 hover:underline">{acct.name}</Link></TableCell>
                <TableCell>{acct.accountType}</TableCell>
                <TableCell className="text-right">{acct.isActive ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <CreateAccountSheet open={createOpen} onOpenChange={setCreateOpen} />
    </PageWrapper>
  );
}
```

- [ ] **Step 15.2 — Create `features/accounting/create-account-sheet.tsx`**

```tsx
"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { EntityFormSheet } from "@/components/shared";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateAccount } from "@/lib/api/hooks/accounting";

const schema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(120),
  accountType: z.enum(["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"]),
  description: z.string().max(500).optional(),
});
type Values = z.infer<typeof schema>;

export function CreateAccountSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const create = useCreateAccount();
  return (
    <EntityFormSheet<Values>
      open={open}
      onOpenChange={onOpenChange}
      title="New account"
      resolver={zodResolver(schema)}
      defaultValues={{ code: "", name: "", accountType: "EXPENSE", description: "" }}
      onSubmit={(values) =>
        create.mutateAsync(values).then(() => {
          toast.success("Account created");
          onOpenChange(false);
        }).catch((e) => toast.error(e instanceof Error ? e.message : "Failed to create"))
      }
      isSubmitting={create.isPending}
      resetOnOpen
    >
      {(form) => (
        <>
          <FormField control={form.control} name="code" render={({ field }) => (
            <FormItem><FormLabel>Code</FormLabel><FormControl><Input {...field} placeholder="e.g. 6000" /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="accountType" render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl><SelectTrigger><SelectValue placeholder="Pick a type" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="ASSET">Asset</SelectItem>
                  <SelectItem value="LIABILITY">Liability</SelectItem>
                  <SelectItem value="EQUITY">Equity</SelectItem>
                  <SelectItem value="INCOME">Income</SelectItem>
                  <SelectItem value="EXPENSE">Expense</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} rows={3} /></FormControl><FormMessage /></FormItem>
          )} />
        </>
      )}
    </EntityFormSheet>
  );
}
```

- [ ] **Step 15.3 — Create `app/(dashboard)/accounting/coa/[accountId]/page.tsx`**

Read-only detail page. Looks up the account by id and shows its name, code, type, status. Recent journal lines for this account are fetched via the existing journal endpoint filtered server-side by account in a follow-up (Session 2). For this MVP, only show the account header and a "Coming soon" placeholder for the lines list.

```tsx
"use client";
import { use } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { useAccounts } from "@/lib/api/hooks/accounting";

export default function AccountDetailPage({ params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = use(params);
  const id = Number(accountId);
  const query = useAccounts({ page: 1, pageSize: 200 });
  const account = query.data?.items.find((a) => a.id === id);

  return (
    <PageWrapper title={account ? `${account.code} — ${account.name}` : "Account"} eyebrow="Accounting · COA">
      {account ? (
        <Card className="p-6">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <dt className="text-slate-600">Code</dt><dd className="font-mono">{account.code}</dd>
            <dt className="text-slate-600">Name</dt><dd>{account.name}</dd>
            <dt className="text-slate-600">Type</dt><dd>{account.accountType}</dd>
            <dt className="text-slate-600">Status</dt><dd>{account.isActive ? "Active" : "Inactive"}</dd>
            <dt className="text-slate-600">Description</dt><dd>{account.description ?? "—"}</dd>
          </dl>
          <p className="mt-6 text-sm text-slate-600">Recent journal lines for this account: arriving in Session 2.</p>
        </Card>
      ) : query.isLoading ? (
        <div>Loading…</div>
      ) : (
        <div>Not found.</div>
      )}
    </PageWrapper>
  );
}
```

- [ ] **Step 15.4 — Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: clean.

- [ ] **Step 15.5 — User reviews; stop here**

---

## Task 16: Journal pages

**Files:**
- Create: `app/(dashboard)/accounting/journal/page.tsx`
- Create: `app/(dashboard)/accounting/journal/[entryId]/page.tsx`

- [ ] **Step 16.1 — Create `app/(dashboard)/accounting/journal/page.tsx`**

```tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useJournal } from "@/lib/api/hooks/accounting";

export default function JournalListPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const query = useJournal({ page: 1, pageSize: 100, from: from || undefined, to: to || undefined });

  return (
    <PageWrapper title="Journal" eyebrow="Accounting" description="Every posted journal entry.">
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="From" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} placeholder="To" />
      </div>
      <div className="rounded-lg border border-slate-200/70 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Entry #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.data?.items.map((je) => (
              <TableRow key={je.id}>
                <TableCell className="font-mono"><Link href={`/accounting/journal/${je.id}`} className="text-blue-600 hover:underline">{je.entryNumber}</Link></TableCell>
                <TableCell>{je.entryDate}</TableCell>
                <TableCell>{je.sourceType}</TableCell>
                <TableCell>{je.description ?? "—"}</TableCell>
                <TableCell>{je.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PageWrapper>
  );
}
```

- [ ] **Step 16.2 — Create `app/(dashboard)/accounting/journal/[entryId]/page.tsx`**

```tsx
"use client";
import { use } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useJournalEntry } from "@/lib/api/hooks/accounting";

export default function JournalEntryDetailPage({ params }: { params: Promise<{ entryId: string }> }) {
  const { entryId } = use(params);
  const id = Number(entryId);
  const query = useJournalEntry(id);
  const entry = query.data;

  const totalDebit = entry?.lines?.reduce((acc, l) => acc + Number(l.debit), 0) ?? 0;
  const totalCredit = entry?.lines?.reduce((acc, l) => acc + Number(l.credit), 0) ?? 0;

  return (
    <PageWrapper title={entry?.entryNumber ?? "Journal entry"} eyebrow="Accounting · Journal">
      {entry ? (
        <>
          <Card className="p-6 mb-4">
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <dt className="text-slate-600">Date</dt><dd>{entry.entryDate}</dd>
              <dt className="text-slate-600">Source</dt><dd>{entry.sourceType}/{entry.sourceEvent ?? "—"}</dd>
              <dt className="text-slate-600">Status</dt><dd>{entry.status}</dd>
              <dt className="text-slate-600">Description</dt><dd className="col-span-1 sm:col-span-3">{entry.description ?? "—"}</dd>
            </dl>
          </Card>
          <div className="rounded-lg border border-slate-200/70 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entry.lines?.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono">{l.accountCode} — {l.accountName}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(l.debit) > 0 ? Number(l.debit).toFixed(2) : ""}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(l.credit) > 0 ? Number(l.credit).toFixed(2) : ""}</TableCell>
                    <TableCell>{l.description ?? "—"}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-medium bg-slate-50">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right tabular-nums">{totalDebit.toFixed(2)}</TableCell>
                  <TableCell className="text-right tabular-nums">{totalCredit.toFixed(2)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </>
      ) : query.isLoading ? <div>Loading…</div> : <div>Not found.</div>}
    </PageWrapper>
  );
}
```

- [ ] **Step 16.3 — Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: clean.

- [ ] **Step 16.4 — User reviews; stop here**

---

## Task 17: Report pages — Trial Balance + Profit & Loss

**Files:**
- Create: `app/(dashboard)/accounting/reports/trial-balance/page.tsx`
- Create: `app/(dashboard)/accounting/reports/profit-loss/page.tsx`

- [ ] **Step 17.1 — Create `app/(dashboard)/accounting/reports/trial-balance/page.tsx`**

```tsx
"use client";
import { useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTrialBalance } from "@/lib/api/hooks/accounting";

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function TrialBalancePage() {
  const [asOf, setAsOf] = useState(todayIso());
  const query = useTrialBalance(asOf);
  const tb = query.data;

  return (
    <PageWrapper title="Trial Balance" eyebrow="Accounting · Reports" description="Ledger balances as of a chosen date.">
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-end">
        <div>
          <label className="text-sm text-slate-600 block mb-1">As of</label>
          <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
        </div>
        {tb && (
          <div className="ml-auto text-sm">
            {tb.balanced ? <span className="text-emerald-600">Balanced ✓</span> : <span className="text-red-600">Imbalanced — see below</span>}
          </div>
        )}
      </div>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tb?.rows.map((r) => (
              <TableRow key={r.accountId}>
                <TableCell className="font-mono">{r.code}</TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.accountType}</TableCell>
                <TableCell className="text-right tabular-nums">{Number(r.debit).toFixed(2)}</TableCell>
                <TableCell className="text-right tabular-nums">{Number(r.credit).toFixed(2)}</TableCell>
                <TableCell className="text-right tabular-nums">{Number(r.balance).toFixed(2)}</TableCell>
              </TableRow>
            ))}
            {tb && (
              <TableRow className="font-medium bg-slate-50">
                <TableCell colSpan={3}>Total</TableCell>
                <TableCell className="text-right tabular-nums">{Number(tb.totalDebit).toFixed(2)}</TableCell>
                <TableCell className="text-right tabular-nums">{Number(tb.totalCredit).toFixed(2)}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </PageWrapper>
  );
}
```

- [ ] **Step 17.2 — Create `app/(dashboard)/accounting/reports/profit-loss/page.tsx`**

```tsx
"use client";
import { useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useProfitLoss } from "@/lib/api/hooks/accounting";

const firstOfMonth = () => { const d = new Date(); d.setUTCDate(1); return d.toISOString().slice(0, 10); };
const lastOfMonth = () => { const d = new Date(); d.setUTCMonth(d.getUTCMonth() + 1, 0); return d.toISOString().slice(0, 10); };

export default function ProfitLossPage() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(lastOfMonth());
  const query = useProfitLoss(from, to);
  const pnl = query.data;

  return (
    <PageWrapper title="Profit & Loss" eyebrow="Accounting · Reports" description="Income minus expense for the selected range.">
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-end">
        <div><label className="text-sm text-slate-600 block mb-1">From</label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><label className="text-sm text-slate-600 block mb-1">To</label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      </div>

      {pnl && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="overflow-hidden">
            <div className="px-4 py-3 font-medium bg-emerald-50 border-b border-emerald-200/60">Income</div>
            <Table>
              <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Account</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>
                {pnl.income.map((r) => (
                  <TableRow key={r.accountId}>
                    <TableCell className="font-mono">{r.code}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(r.amount).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-medium bg-slate-50"><TableCell colSpan={2}>Total Income</TableCell><TableCell className="text-right tabular-nums">{Number(pnl.totalIncome ?? 0).toFixed(2)}</TableCell></TableRow>
              </TableBody>
            </Table>
          </Card>
          <Card className="overflow-hidden">
            <div className="px-4 py-3 font-medium bg-rose-50 border-b border-rose-200/60">Expense</div>
            <Table>
              <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Account</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>
                {pnl.expense.map((r) => (
                  <TableRow key={r.accountId}>
                    <TableCell className="font-mono">{r.code}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(r.amount).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-medium bg-slate-50"><TableCell colSpan={2}>Total Expense</TableCell><TableCell className="text-right tabular-nums">{Number(pnl.totalExpense ?? 0).toFixed(2)}</TableCell></TableRow>
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {pnl && (
        <Card className="p-4 mt-4 flex justify-between items-center bg-slate-50">
          <div className="font-medium">Net income</div>
          <div className="text-lg font-mono tabular-nums">{Number(pnl.netIncome).toFixed(2)}</div>
        </Card>
      )}
    </PageWrapper>
  );
}
```

- [ ] **Step 17.3 — Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: clean.

- [ ] **Step 17.4 — User reviews; stop here**

---

## Task 18: Invoice UI GST upgrade

**Files:**
- Modify: `app/(dashboard)/billing/invoices/new/page.tsx`
- (Optional) Modify: `app/(dashboard)/billing/invoices/[invoiceId]/edit/page.tsx` if it exists

- [ ] **Step 18.1 — Read the existing new-invoice page**

```bash
cat 'app/(dashboard)/billing/invoices/new/page.tsx'
```

Note its current form state shape and submit payload — the upgrade extends it without breaking existing fields.

- [ ] **Step 18.2 — Add a `gstRate` and `hsnSacCode` field to each line item in the line-items editor**

Each line should have: description, hsnSacCode (optional text), quantity, rate, gstRate (Select 0/5/12/18/28), amount (computed display).

- [ ] **Step 18.3 — Add a new "GST" panel above the totals area**

Fields:
- `placeOfSupply` — Select. Options sourced from a new `useIndianStates` hook OR a hard-coded list inside the file (29 states from `lib/accounting/seed-states.ts`). Default: blank.
- `customerGstin` — text input
- `supplierGstin` — text input (read-only, pre-filled from `organization.gstin` if available; otherwise an empty editable)
- `reverseCharge` — checkbox

- [ ] **Step 18.4 — Render computed CGST/SGST/IGST in the totals area**

Below subtotal, compute live:
```ts
const subtotal = items.reduce((acc, i) => acc + i.quantity * i.rate, 0);
const taxPool = items.reduce((acc, i) => acc + i.quantity * i.rate * (i.gstRate / 100), 0);
const supplierState = supplierGstin ? supplierGstin.slice(0, 2) : (orgStateCode ?? "");
const placeStateCode = placeOfSupply || (customerGstin ? customerGstin.slice(0, 2) : supplierState);
const intra = supplierState === placeStateCode;
const cgst = intra ? taxPool / 2 : 0;
const sgst = intra ? taxPool / 2 : 0;
const igst = intra ? 0 : taxPool;
const total = subtotal + cgst + sgst + igst - (discount ?? 0);
```

Display CGST and SGST rows when intra-state; IGST row when inter-state.

- [ ] **Step 18.5 — Update the submit payload**

The submit handler now sends `items` (the new array form) AND `placeOfSupply`, `customerGstin`, `supplierGstin`, `reverseCharge` to `POST /api/invoices`. Drop the legacy `lineItems` payload key from new submissions (the API still computes the JSONB mirror on the server during Session 1).

- [ ] **Step 18.6 — Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: clean.

- [ ] **Step 18.7 — User reviews; stop here**

---

## Task 19: Sidebar Accounting section

**Files:**
- Modify: `components/layout/app-sidebar.tsx`

- [ ] **Step 19.1 — Read the sidebar**

```bash
sed -n '1,80p' components/layout/app-sidebar.tsx
```

Find how existing sidebar sections (CRM, HR, Projects) are declared. Match that pattern exactly.

- [ ] **Step 19.2 — Add an Accounting section**

Add an entry between Finance/Billing and Reports (or wherever Finance lives currently). Use `Calculator` from lucide-react. Sub-links:
- "Overview" → `/accounting`
- "Chart of Accounts" → `/accounting/coa`
- "Journal" → `/accounting/journal`
- "Trial Balance" → `/accounting/reports/trial-balance`
- "Profit & Loss" → `/accounting/reports/profit-loss`

If the sidebar already has a role-gating mechanism (`visibleTo: ["OWNER", "CEO", "HR"]` or similar), use it to restrict the section. If it uses the existing `dashboard-gate` helper, wrap appropriately. Do not invent a new role-gating concept.

- [ ] **Step 19.3 — Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: clean.

- [ ] **Step 19.4 — User reviews; stop here**

---

## Task 20: Smoke test script + JSONB → invoice_items data migration + final verification

**Files:**
- Create: `scripts/migrate-invoice-items.ts`
- Create: `scripts/test-accounting.ts`

- [ ] **Step 20.1 — Create `scripts/migrate-invoice-items.ts`**

```ts
import { config } from "dotenv";
config({ path: ".env" });

import { db } from "@/lib/db";
import { invoices, invoiceItems } from "@/lib/db/schema/crm";
import { eq, isNull, sql } from "drizzle-orm";

async function main() {
  const rows = await db
    .select({ id: invoices.id, lineItems: invoices.lineItems, taxRate: invoices.taxRate })
    .from(invoices);

  let migrated = 0, skipped = 0, failed = 0;
  for (const inv of rows) {
    const existing = await db.select({ c: sql<number>`count(*)::int` }).from(invoiceItems).where(eq(invoiceItems.invoiceId, inv.id));
    if ((existing[0]?.c ?? 0) > 0) { skipped++; continue; }

    const items = Array.isArray(inv.lineItems) ? inv.lineItems : [];
    const gstRate = inv.taxRate ? Number(inv.taxRate) : 0;
    try {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it || typeof it.description !== "string") { failed++; continue; }
        const quantity = Number(it.quantity ?? 1);
        const rate = Number(it.rate ?? 0);
        const amount = Number(it.amount ?? quantity * rate);
        await db.insert(invoiceItems).values({
          invoiceId: inv.id,
          description: it.description,
          quantity: quantity.toFixed(4),
          rate: rate.toFixed(4),
          gstRate: gstRate.toFixed(2),
          amount: amount.toFixed(4),
          lineOrder: i,
        });
      }
      migrated++;
    } catch (err) {
      console.error(`Invoice ${inv.id} failed:`, err);
      failed++;
    }
  }
  console.log({ migrated, skipped, failed, total: rows.length });
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 20.2 — Create `scripts/test-accounting.ts`**

```ts
import { config } from "dotenv";
config({ path: ".env" });

import { splitTaxPool, computeLineAmount, computeLineTax } from "@/lib/accounting/posting-rules";

function assert(cond: boolean, msg: string) { if (!cond) { console.error("FAIL:", msg); process.exit(1); } else console.log("PASS:", msg); }

// Intra-state — CGST + SGST split
const intra = splitTaxPool(180, { supplierStateCode: "27", placeOfSupplyStateCode: "27" });
assert(intra.cgst === 90 && intra.sgst === 90 && intra.igst === 0, "intra-state splits CGST+SGST equally");

// Inter-state — IGST full
const inter = splitTaxPool(180, { supplierStateCode: "27", placeOfSupplyStateCode: "29" });
assert(inter.igst === 180 && inter.cgst === 0 && inter.sgst === 0, "inter-state goes to IGST");

// Odd-paisa split keeps total exact
const odd = splitTaxPool(0.03, { supplierStateCode: "27", placeOfSupplyStateCode: "27" });
assert(Math.abs(odd.cgst + odd.sgst - 0.03) < 0.0001, "odd-paisa split sums back to total");

// Line amounts/tax
const line = { quantity: 3, rate: 100, gstRate: 18 };
assert(computeLineAmount(line) === 300, "line amount 3*100=300");
assert(computeLineTax(line) === 54, "line tax at 18% = 54");

console.log("Posting-rules smoke checks passed.");
process.exit(0);
```

- [ ] **Step 20.3 — Final type-check**

Run: `pnpm exec tsc --noEmit`
Expected: completely clean across the whole repo. Pre-existing tsc errors noted in `PASS_3_STATUS.md` (in `app/api/{ai/suggestions,chat,expenses/import,storage/upload}/route.ts`) may persist — verify they are NOT introduced by this work by spot-checking the file list and diff. If new tsc errors appear in accounting-touched files, fix before continuing.

- [ ] **Step 20.4 — Run the posting-rules smoke**

Run: `pnpm exec tsx --env-file=.env scripts/test-accounting.ts`
Expected: all `PASS:` lines, no `FAIL:`.

- [ ] **Step 20.5 — Run drizzle generate one more time and inspect the SQL**

Run: `pnpm exec drizzle-kit generate`
Expected: no further diffs beyond what was generated in earlier tasks. Open `drizzle/000X_*.sql` files and confirm they look sensible — column types, constraints, and indexes match this plan.

- [ ] **Step 20.6 — Manual UI smoke (user-driven)**

The user starts `pnpm dev`, signs in as an OWNER/CEO/HR user, and walks the following golden path:
1. `/accounting` — hub renders, stat cards populated
2. `/accounting/coa` — 50 default accounts visible, grouped by tabs; create one new account
3. `/billing/invoices/new` — create an intra-state invoice with two lines at 18% and 5% GST; submit as SENT
4. `/accounting/journal` — new entry visible
5. Click into it — debits = credits, 4 lines (AR, Sales, Output CGST, Output SGST)
6. `/accounting/reports/trial-balance` — balanced
7. `/accounting/reports/profit-loss` — sales revenue shows on income side
8. Record a payment on the invoice — new payment entry appears in journal (Bank DR / AR CR)
9. Repeat with an inter-state invoice (different `placeOfSupply` state code) — verify IGST instead of CGST/SGST

- [ ] **Step 20.7 — User reviews; ship Session 1**

User commits (Claude does not commit per project rule). Session 1 is done.

---

# Session 2 hooks (out of scope, here for reference)

Plan to add in Session 2 (not this session):
- Customer ledger page (filtered journal lines by client)
- Vendor ledger page (needs vendor schema first)
- Aged receivables/payables
- GSTR-1 read-only summary
- TDS deduction tracking
- Purchase bills
- Reversing-entry endpoint for invoice/payment voids

These reuse the schema set in Tasks 1–7. Nothing in Session 1 blocks them.

---

# Self-review

- [x] **Spec coverage** — Every Session 1 deliverable in the spec maps to at least one task:
  - COA + seed → Tasks 2, 4
  - GST-aware invoice → Tasks 3, 12, 18
  - Journal entries → Tasks 2, 6, 7
  - Auto-posting rules → Tasks 5, 7, 12
  - TB + P&L → Tasks 11, 17
  - Indian states reference → Tasks 1, 2
  - Cache/RBAC/validation → Task 8 (cross-cutting)
  - Sidebar exposure → Task 19
- [x] **No placeholders** — every step includes either the actual code, the exact command, or a precise "read the existing handler, then do X with this code" instruction.
- [x] **Type consistency** — `Account.id`, `JournalEntry.id`, `JournalLine.id` are all `number` (serial integers). `sourceId` is `string` (stringified). `accountCode` is `string`. GST amounts are `decimal(18,4)` in the DB, returned as strings, converted to `Number` on display only. The `withRoles([...])` signature is asserted in Task 9 and re-used identically across Tasks 9–11.
- [x] **Spec deviations** — None. The plan adopts every spec decision.

---

# Execution choice

Two options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Best for a long plan like this one.
2. **Inline Execution** — I run the tasks myself in this session, checkpoint at major boundaries.

Pick one to proceed.
