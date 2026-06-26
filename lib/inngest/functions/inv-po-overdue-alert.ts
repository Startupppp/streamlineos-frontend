import { inngest } from "../client";
import { db } from "@/lib/db";
import { invPurchaseOrders, organizationMembers, notifications } from "@/lib/db/schema";
import { and, eq, inArray, lt, isNotNull, sql } from "drizzle-orm";
import { format } from "date-fns";
import { logger } from "@/lib/logger";

export const invPoOverdueAlert = inngest.createFunction(
  {
    id: "inv-po-overdue-alert",
    name: "Inventory PO Overdue Alert",
    triggers: { cron: "0 8 * * *" },
  },
  async ({ step }) => {
    const result = await step.run("alert-overdue-purchase-orders", async () => {
      const todayStr = format(new Date(), "yyyy-MM-dd");

      const overduePOs = await db
        .select({
          id: invPurchaseOrders.id,
          orgId: invPurchaseOrders.orgId,
          poNumber: invPurchaseOrders.poNumber,
          status: invPurchaseOrders.status,
          expectedDeliveryDate: invPurchaseOrders.expectedDeliveryDate,
        })
        .from(invPurchaseOrders)
        .where(
          and(
            inArray(invPurchaseOrders.status, ["SENT", "PARTIAL"]),
            isNotNull(invPurchaseOrders.expectedDeliveryDate),
            lt(invPurchaseOrders.expectedDeliveryDate, todayStr),
          ),
        );

      if (overduePOs.length === 0) {
        logger.info("[inv-po-overdue-alert] No overdue purchase orders found");
        return { totalOverdue: 0, orgsNotified: 0 };
      }

      logger.info(`[inv-po-overdue-alert] Found ${overduePOs.length} overdue PO(s)`);

      const byOrg = new Map<string, { poNumber: string; expectedDeliveryDate: string | null }[]>();
      for (const po of overduePOs) {
        const entry = byOrg.get(po.orgId) ?? [];
        entry.push({ poNumber: po.poNumber, expectedDeliveryDate: po.expectedDeliveryDate });
        byOrg.set(po.orgId, entry);
      }

      let orgsNotified = 0;

      for (const [orgId, pos] of byOrg) {
        const count = pos.length;
        const title = count === 1 ? "Purchase Order Overdue" : `${count} Purchase Orders Overdue`;
        const poList = pos
          .slice(0, 3)
          .map((p) =>
            p.expectedDeliveryDate
              ? `${p.poNumber} (expected ${p.expectedDeliveryDate})`
              : p.poNumber,
          )
          .join(", ");
        const message =
          count <= 3
            ? `${poList} past expected delivery date.`
            : `${poList} and ${count - 3} more PO(s) are past their expected delivery date.`;

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
            type: "ERROR" as const,
            title,
            message,
            link: "/inventory/purchase-orders",
            metadata: { overdueCount: count, poNumbers: pos.map((p) => p.poNumber) },
          })),
        );

        orgsNotified++;
      }

      return { totalOverdue: overduePOs.length, orgsNotified };
    });

    return result;
  },
);
