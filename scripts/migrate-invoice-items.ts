import { config } from "dotenv";
config({ path: ".env" });

import { db } from "@/lib/db";
import { invoices, invoiceItems } from "@/lib/db/schema/crm";
import { eq, sql } from "drizzle-orm";

function parseNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function isLineItemLike(value: unknown): value is {
  description: string;
  quantity?: unknown;
  rate?: unknown;
  amount?: unknown;
} {
  if (!value || typeof value !== "object") return false;
  if (!("description" in value)) return false;
  return typeof value.description === "string";
}

async function main(): Promise<void> {
  const rows = await db
    .select({ id: invoices.id, lineItems: invoices.lineItems, taxRate: invoices.taxRate })
    .from(invoices);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const inv of rows) {
    const existing = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, inv.id));
    const existingCount = existing[0]?.c ?? 0;
    if (existingCount > 0) {
      skipped += 1;
      continue;
    }

    const items: unknown[] = Array.isArray(inv.lineItems) ? inv.lineItems : [];
    const gstRate = inv.taxRate ? Number(inv.taxRate) : 0;

    try {
      for (let i = 0; i < items.length; i += 1) {
        const item = items[i];
        if (!isLineItemLike(item)) {
          failed += 1;
          continue;
        }
        const quantity = parseNumber(item.quantity, 1);
        const rate = parseNumber(item.rate, 0);
        const amount = parseNumber(item.amount, quantity * rate);
        await db.insert(invoiceItems).values({
          invoiceId: inv.id,
          description: item.description,
          quantity: quantity.toFixed(4),
          rate: rate.toFixed(4),
          gstRate: gstRate.toFixed(2),
          amount: amount.toFixed(4),
          lineOrder: i,
        });
      }
      migrated += 1;
    } catch (error) {
      console.error(`Invoice ${inv.id} failed:`, error);
      failed += 1;
    }
  }

  console.log({ migrated, skipped, failed, total: rows.length });
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
