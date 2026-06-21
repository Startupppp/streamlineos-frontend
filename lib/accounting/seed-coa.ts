import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { ledgerAccounts } from "@/lib/db/schema/accounting";

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
    .select({ code: ledgerAccounts.code })
    .from(ledgerAccounts)
    .where(eq(ledgerAccounts.orgId, orgId))
    .limit(1);
  if (existing.length > 0) return;

  for (const row of DEFAULT_COA) {
    await db
      .insert(ledgerAccounts)
      .values({ orgId, code: row.code, name: row.name, accountType: row.accountType })
      .onConflictDoNothing();
  }
}

export async function ensureAccountExists(orgId: string, code: string): Promise<number | null> {
  const found = await db
    .select({ id: ledgerAccounts.id })
    .from(ledgerAccounts)
    .where(and(eq(ledgerAccounts.orgId, orgId), eq(ledgerAccounts.code, code)))
    .limit(1);
  return found[0]?.id ?? null;
}
