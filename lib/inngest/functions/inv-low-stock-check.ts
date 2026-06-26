import { inngest } from "../client";
import { db } from "@/lib/db";
import {
  invStockLevels,
  invProductVariants,
  invProducts,
  organizationMembers,
  notifications,
} from "@/lib/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { logger } from "@/lib/logger";

export const invLowStockCheck = inngest.createFunction(
  {
    id: "inv-low-stock-check",
    name: "Inventory Low Stock Check",
    triggers: { cron: "0 7 * * *" },
  },
  async ({ step }) => {
    const result = await step.run("check-low-stock-levels", async () => {
      const lowStockRows = await db
        .select({
          orgId: invStockLevels.orgId,
          productVariantId: invStockLevels.productVariantId,
          onHand: invStockLevels.onHand,
          productId: invProductVariants.productId,
          variantName: invProductVariants.name,
          variantSku: invProductVariants.sku,
          productName: invProducts.name,
          reorderPoint: invProducts.reorderPoint,
        })
        .from(invStockLevels)
        .innerJoin(
          invProductVariants,
          eq(invStockLevels.productVariantId, invProductVariants.id),
        )
        .innerJoin(
          invProducts,
          eq(invProductVariants.productId, invProducts.id),
        )
        .where(
          sql`${invStockLevels.onHand}::numeric <= ${invProducts.reorderPoint}::numeric`,
        );

      if (lowStockRows.length === 0) {
        logger.info("[inv-low-stock-check] No low-stock items found");
        return { totalLowStock: 0, orgsNotified: 0 };
      }

      logger.info(`[inv-low-stock-check] Found ${lowStockRows.length} low-stock item(s)`);

      const byOrg = new Map<
        string,
        { productName: string; sku: string; onHand: string; reorderPoint: string }[]
      >();
      for (const row of lowStockRows) {
        const entry = byOrg.get(row.orgId) ?? [];
        entry.push({
          productName: row.productName,
          sku: row.variantSku,
          onHand: row.onHand,
          reorderPoint: row.reorderPoint,
        });
        byOrg.set(row.orgId, entry);
      }

      let orgsNotified = 0;

      for (const [orgId, items] of byOrg) {
        const count = items.length;
        const title = count === 1 ? "Low Stock Alert" : `${count} Products Below Reorder Point`;
        const productList = items
          .slice(0, 3)
          .map((i) => `${i.productName} (${i.sku}): ${Number(i.onHand).toFixed(2)} on hand`)
          .join(", ");
        const message =
          count <= 3
            ? `${productList} — below reorder point.`
            : `${productList} and ${count - 3} more product(s) are below their reorder point.`;

        const managers = await db
          .select({ userId: organizationMembers.userId })
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.orgId, orgId),
              sql`${organizationMembers.role} IN ('CEO', 'BRANCH_MANAGER', 'FINANCE')`,
            ),
          );

        if (managers.length === 0) continue;

        await db.insert(notifications).values(
          managers.map((m) => ({
            orgId,
            userId: m.userId,
            type: "WARNING" as const,
            title,
            message,
            link: "/inventory/products",
            metadata: { lowStockCount: count, skus: items.map((i) => i.sku) },
          })),
        );

        orgsNotified++;
      }

      return { totalLowStock: lowStockRows.length, orgsNotified };
    });

    return result;
  },
);
