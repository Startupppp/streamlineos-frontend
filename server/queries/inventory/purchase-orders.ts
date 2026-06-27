"server-only";

import { db } from "@/lib/db";
import { invPurchaseOrders } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export interface PurchaseOrderFilters {
  status?: "DRAFT" | "SENT" | "PARTIAL" | "RECEIVED" | "CLOSED" | "CANCELLED";
  vendorId?: number;
  page?: number;
  limit?: number;
}

export async function getPurchaseOrders(orgId: string, filters?: PurchaseOrderFilters) {
  const limit = filters?.limit ?? 50;
  const offset = ((filters?.page ?? 1) - 1) * limit;

  const conditions = [eq(invPurchaseOrders.orgId, orgId)];
  if (filters?.status) conditions.push(eq(invPurchaseOrders.status, filters.status));
  if (filters?.vendorId) conditions.push(eq(invPurchaseOrders.vendorId, filters.vendorId));

  const [items, [countResult]] = await Promise.all([
    db.query.invPurchaseOrders.findMany({
      where: and(...conditions),
      orderBy: [desc(invPurchaseOrders.createdAt)],
      limit,
      offset,
      with: {
        vendor: { columns: { id: true, name: true, code: true } },
        warehouse: { columns: { id: true, name: true } },
        creator: { columns: { id: true, name: true } },
      },
    }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(invPurchaseOrders)
      .where(and(...conditions)),
  ]);

  return {
    items,
    total: countResult?.count ?? 0,
    page: filters?.page ?? 1,
    totalPages: Math.ceil((countResult?.count ?? 0) / limit),
  };
}

export async function getPurchaseOrder(orgId: string, poId: number) {
  return db.query.invPurchaseOrders.findFirst({
    where: and(eq(invPurchaseOrders.id, poId), eq(invPurchaseOrders.orgId, orgId)),
    with: {
      vendor: true,
      warehouse: { columns: { id: true, name: true, code: true } },
      creator: { columns: { id: true, name: true } },
      lines: {
        with: {
          productVariant: {
            columns: { id: true, name: true, sku: true },
            with: {
              product: { columns: { id: true, name: true } },
            },
          },
        },
        orderBy: (lines, { asc }) => [asc(lines.lineOrder)],
      },
      grns: {
        orderBy: (grns, { desc: descOrder }) => [descOrder(grns.createdAt)],
        with: {
          creator: { columns: { id: true, name: true } },
          lines: true,
        },
      },
    },
  });
}
