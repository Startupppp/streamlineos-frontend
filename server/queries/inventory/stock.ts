"server-only";

import { db } from "@/lib/db";
import {
  invStockLevels,
  invStockTransactions,
  invStockTransfers,
  invProductVariants,
  invProducts,
  invLocations,
  invWarehouses,
} from "@/lib/db/schema";
import { eq, and, desc, sql, gte, lte, lt } from "drizzle-orm";

export interface ListStockLevelsFilters {
  warehouseId?: number;
  productId?: number;
  lowStock?: boolean;
  page?: number;
  limit?: number;
}

export async function listStockLevels(orgId: string, filters?: ListStockLevelsFilters) {
  const limit = filters?.limit ?? 50;
  const offset = ((filters?.page ?? 1) - 1) * limit;

  const conditions = [eq(invStockLevels.orgId, orgId)];

  const [items, [countResult]] = await Promise.all([
    db.query.invStockLevels.findMany({
      where: and(...conditions),
      orderBy: [desc(invStockLevels.updatedAt)],
      limit,
      offset,
      with: {
        productVariant: {
          with: {
            product: {
              columns: {
                id: true,
                name: true,
                sku: true,
                reorderPoint: true,
                minStockLevel: true,
              },
            },
          },
        },
        location: {
          with: {
            warehouse: { columns: { id: true, name: true, code: true } },
          },
        },
      },
    }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(invStockLevels)
      .where(and(...conditions)),
  ]);

  let filtered = items;

  if (filters?.warehouseId !== undefined) {
    filtered = filtered.filter(
      (item) => item.location.warehouse.id === filters.warehouseId
    );
  }

  if (filters?.productId !== undefined) {
    filtered = filtered.filter(
      (item) => item.productVariant.product.id === filters.productId
    );
  }

  if (filters?.lowStock) {
    filtered = filtered.filter(
      (item) =>
        parseFloat(item.onHand) <=
        parseFloat(item.productVariant.product.reorderPoint)
    );
  }

  return {
    items: filtered,
    total: countResult?.count ?? 0,
    page: filters?.page ?? 1,
    totalPages: Math.ceil((countResult?.count ?? 0) / limit),
  };
}

export interface ListTransactionsFilters {
  productVariantId?: number;
  locationId?: number;
  transactionType?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export async function listStockTransactions(
  orgId: string,
  filters?: ListTransactionsFilters
) {
  const limit = filters?.limit ?? 50;
  const offset = ((filters?.page ?? 1) - 1) * limit;

  const conditions = [eq(invStockTransactions.orgId, orgId)];

  if (filters?.productVariantId !== undefined) {
    conditions.push(
      eq(invStockTransactions.productVariantId, filters.productVariantId)
    );
  }
  if (filters?.locationId !== undefined) {
    conditions.push(eq(invStockTransactions.locationId, filters.locationId));
  }
  if (filters?.transactionType !== undefined) {
    conditions.push(
      eq(
        invStockTransactions.transactionType,
        filters.transactionType as typeof invStockTransactions.transactionType._.data
      )
    );
  }
  if (filters?.fromDate) {
    conditions.push(gte(invStockTransactions.createdAt, new Date(filters.fromDate)));
  }
  if (filters?.toDate) {
    conditions.push(lte(invStockTransactions.createdAt, new Date(filters.toDate)));
  }

  const [items, [countResult]] = await Promise.all([
    db.query.invStockTransactions.findMany({
      where: and(...conditions),
      orderBy: [desc(invStockTransactions.createdAt)],
      limit,
      offset,
      with: {
        productVariant: {
          columns: { id: true, name: true, sku: true },
          with: { product: { columns: { id: true, name: true } } },
        },
        location: {
          columns: { id: true, name: true, code: true },
        },
        creator: { columns: { id: true, name: true } },
      },
    }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(invStockTransactions)
      .where(and(...conditions)),
  ]);

  return {
    items,
    total: countResult?.count ?? 0,
    page: filters?.page ?? 1,
    totalPages: Math.ceil((countResult?.count ?? 0) / limit),
  };
}

export interface ListTransfersFilters {
  page?: number;
  limit?: number;
}

export async function listStockTransfers(
  orgId: string,
  filters?: ListTransfersFilters
) {
  const limit = filters?.limit ?? 50;
  const offset = ((filters?.page ?? 1) - 1) * limit;

  const [items, [countResult]] = await Promise.all([
    db.query.invStockTransfers.findMany({
      where: eq(invStockTransfers.orgId, orgId),
      orderBy: [desc(invStockTransfers.createdAt)],
      limit,
      offset,
      with: {
        fromLocation: {
          columns: { id: true, name: true, code: true },
          with: { warehouse: { columns: { id: true, name: true } } },
        },
        toLocation: {
          columns: { id: true, name: true, code: true },
          with: { warehouse: { columns: { id: true, name: true } } },
        },
        creator: { columns: { id: true, name: true } },
        lines: {
          with: {
            productVariant: {
              columns: { id: true, name: true, sku: true },
              with: { product: { columns: { id: true, name: true } } },
            },
          },
        },
      },
    }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(invStockTransfers)
      .where(eq(invStockTransfers.orgId, orgId)),
  ]);

  return {
    items,
    total: countResult?.count ?? 0,
    page: filters?.page ?? 1,
    totalPages: Math.ceil((countResult?.count ?? 0) / limit),
  };
}

export async function getStockTransfer(orgId: string, transferId: number) {
  return db.query.invStockTransfers.findFirst({
    where: and(
      eq(invStockTransfers.id, transferId),
      eq(invStockTransfers.orgId, orgId)
    ),
    with: {
      fromLocation: {
        with: { warehouse: { columns: { id: true, name: true, code: true } } },
      },
      toLocation: {
        with: { warehouse: { columns: { id: true, name: true, code: true } } },
      },
      creator: { columns: { id: true, name: true } },
      lines: {
        with: {
          productVariant: {
            with: { product: { columns: { id: true, name: true, sku: true } } },
          },
        },
      },
    },
  });
}
