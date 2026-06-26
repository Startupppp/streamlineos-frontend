"server-only";

import { db } from "@/lib/db";
import { invSalesOrders } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export interface SalesOrderFilters {
  status?: "DRAFT" | "CONFIRMED" | "SHIPPED" | "INVOICED" | "CANCELLED";
  clientId?: number;
  page?: number;
  limit?: number;
}

export async function listSalesOrders(orgId: string, filters?: SalesOrderFilters) {
  const limit = filters?.limit ?? 50;
  const offset = ((filters?.page ?? 1) - 1) * limit;

  const conditions: Parameters<typeof and>[0][] = [eq(invSalesOrders.orgId, orgId)];
  if (filters?.status) {
    conditions.push(eq(invSalesOrders.status, filters.status));
  }
  if (filters?.clientId) {
    conditions.push(eq(invSalesOrders.clientId, filters.clientId));
  }

  const [items, [countResult]] = await Promise.all([
    db.query.invSalesOrders.findMany({
      where: and(...conditions),
      orderBy: [desc(invSalesOrders.createdAt)],
      limit,
      offset,
      with: {
        client: { columns: { id: true, name: true } },
        warehouse: { columns: { id: true, name: true, code: true } },
        creator: { columns: { id: true, name: true } },
      },
    }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(invSalesOrders)
      .where(and(...conditions)),
  ]);

  return {
    items,
    total: countResult?.count ?? 0,
    page: filters?.page ?? 1,
    totalPages: Math.ceil((countResult?.count ?? 0) / limit),
  };
}

export async function getSalesOrderById(orgId: string, soId: number) {
  return db.query.invSalesOrders.findFirst({
    where: and(eq(invSalesOrders.id, soId), eq(invSalesOrders.orgId, orgId)),
    with: {
      client: { columns: { id: true, name: true } },
      warehouse: { columns: { id: true, name: true, code: true } },
      creator: { columns: { id: true, name: true } },
      invoice: { columns: { id: true, invoiceNumber: true, status: true, total: true } },
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
    },
  });
}
