"server-only";

import { db } from "@/lib/db";
import {
  invSalesOrders,
  invPurchaseOrders,
  invStockLevels,
  invStockTransactions,
  invProducts,
  invProductVariants,
  invLocations,
  invWarehouses,
} from "@/lib/db/schema";
import { eq, and, gte, lte, sql, desc, count, sum } from "drizzle-orm";

export async function getInventoryDashboard(orgId: string) {
  const [soStatusCounts, stockValue, lowStockCount, pendingPoCount] = await Promise.all([
    db
      .select({
        status: invSalesOrders.status,
        total: count(),
        value: sum(invSalesOrders.total),
      })
      .from(invSalesOrders)
      .where(eq(invSalesOrders.orgId, orgId))
      .groupBy(invSalesOrders.status),

    db
      .select({ totalValue: sum(sql`${invStockLevels.onHand} * ${invProductVariants.costPrice}`) })
      .from(invStockLevels)
      .innerJoin(invProductVariants, eq(invProductVariants.id, invStockLevels.productVariantId))
      .where(eq(invStockLevels.orgId, orgId)),

    db
      .select({ count: count() })
      .from(invProducts)
      .innerJoin(
        sql`(
          SELECT product_variant_id, SUM(on_hand) as total_on_hand
          FROM inv_stock_levels
          WHERE org_id = ${orgId}
          GROUP BY product_variant_id
        ) sl`,
        sql`sl.product_variant_id IN (
          SELECT id FROM inv_product_variants WHERE product_id = ${invProducts.id}
        )`,
      )
      .where(
        and(
          eq(invProducts.orgId, orgId),
          sql`(
            SELECT COALESCE(SUM(sl2.on_hand), 0)
            FROM inv_stock_levels sl2
            INNER JOIN inv_product_variants pv ON pv.id = sl2.product_variant_id
            WHERE pv.product_id = ${invProducts.id} AND sl2.org_id = ${orgId}
          ) < ${invProducts.reorderPoint}`,
        ),
      ),

    db
      .select({ count: count() })
      .from(invPurchaseOrders)
      .where(
        and(
          eq(invPurchaseOrders.orgId, orgId),
          sql`${invPurchaseOrders.status} IN ('DRAFT', 'SENT', 'PARTIAL')`,
        ),
      ),
  ]);

  const soByStatus = Object.fromEntries(
    soStatusCounts.map((r) => [r.status, { count: r.total, value: r.value ?? "0" }]),
  );

  return {
    salesOrders: {
      byStatus: soByStatus,
      totalOpen: (soByStatus["DRAFT"]?.count ?? 0) + (soByStatus["CONFIRMED"]?.count ?? 0),
      totalShipped: soByStatus["SHIPPED"]?.count ?? 0,
    },
    inventory: {
      totalStockValue: stockValue[0]?.totalValue ?? "0",
      lowStockItemCount: lowStockCount[0]?.count ?? 0,
      pendingPurchaseOrders: pendingPoCount[0]?.count ?? 0,
    },
  };
}

export async function getStockSummary(orgId: string) {
  const rows = await db
    .select({
      productId: invProducts.id,
      productName: invProducts.name,
      sku: invProducts.sku,
      reorderPoint: invProducts.reorderPoint,
      variantId: invProductVariants.id,
      variantName: invProductVariants.name,
      variantSku: invProductVariants.sku,
      warehouseName: invWarehouses.name,
      warehouseCode: invWarehouses.code,
      locationId: invStockLevels.locationId,
      onHand: invStockLevels.onHand,
      committed: invStockLevels.committed,
      onOrder: invStockLevels.onOrder,
    })
    .from(invStockLevels)
    .innerJoin(invProductVariants, eq(invProductVariants.id, invStockLevels.productVariantId))
    .innerJoin(invProducts, eq(invProducts.id, invProductVariants.productId))
    .innerJoin(invLocations, eq(invLocations.id, invStockLevels.locationId))
    .innerJoin(invWarehouses, eq(invWarehouses.id, invLocations.warehouseId))
    .where(eq(invStockLevels.orgId, orgId))
    .orderBy(invProducts.name, invProductVariants.name, invWarehouses.name);

  const productMap = new Map<number, {
    productId: number;
    productName: string;
    sku: string;
    reorderPoint: string;
    totalOnHand: number;
    totalCommitted: number;
    totalOnOrder: number;
    variants: Map<number, {
      variantId: number;
      variantName: string;
      variantSku: string;
      totalOnHand: number;
      totalCommitted: number;
      totalOnOrder: number;
      warehouses: { warehouseName: string; warehouseCode: string; onHand: number; committed: number; onOrder: number }[];
    }>;
  }>();

  for (const row of rows) {
    if (!productMap.has(row.productId)) {
      productMap.set(row.productId, {
        productId: row.productId,
        productName: row.productName,
        sku: row.sku,
        reorderPoint: row.reorderPoint,
        totalOnHand: 0,
        totalCommitted: 0,
        totalOnOrder: 0,
        variants: new Map(),
      });
    }

    const product = productMap.get(row.productId)!;
    const onHand = Number(row.onHand);
    const committed = Number(row.committed);
    const onOrder = Number(row.onOrder);

    if (!product.variants.has(row.variantId)) {
      product.variants.set(row.variantId, {
        variantId: row.variantId,
        variantName: row.variantName,
        variantSku: row.variantSku,
        totalOnHand: 0,
        totalCommitted: 0,
        totalOnOrder: 0,
        warehouses: [],
      });
    }

    const variant = product.variants.get(row.variantId)!;
    variant.totalOnHand += onHand;
    variant.totalCommitted += committed;
    variant.totalOnOrder += onOrder;
    variant.warehouses.push({ warehouseName: row.warehouseName, warehouseCode: row.warehouseCode, onHand, committed, onOrder });

    product.totalOnHand += onHand;
    product.totalCommitted += committed;
    product.totalOnOrder += onOrder;
  }

  return Array.from(productMap.values()).map((p) => ({
    productId: p.productId,
    productName: p.productName,
    sku: p.sku,
    reorderPoint: Number(p.reorderPoint),
    totalOnHand: p.totalOnHand,
    totalCommitted: p.totalCommitted,
    totalOnOrder: p.totalOnOrder,
    available: Math.max(0, p.totalOnHand - p.totalCommitted),
    belowReorder: p.totalOnHand < Number(p.reorderPoint),
    variants: Array.from(p.variants.values()).map((v) => ({
      ...v,
      available: Math.max(0, v.totalOnHand - v.totalCommitted),
    })),
  }));
}

export async function getReorderReport(orgId: string) {
  const rows = await db
    .select({
      productId: invProducts.id,
      productName: invProducts.name,
      sku: invProducts.sku,
      reorderPoint: invProducts.reorderPoint,
      minStockLevel: invProducts.minStockLevel,
      variantId: invProductVariants.id,
      variantName: invProductVariants.name,
      variantSku: invProductVariants.sku,
      onHand: sum(invStockLevels.onHand),
      committed: sum(invStockLevels.committed),
      onOrder: sum(invStockLevels.onOrder),
    })
    .from(invProducts)
    .innerJoin(invProductVariants, eq(invProductVariants.productId, invProducts.id))
    .leftJoin(invStockLevels, and(
      eq(invStockLevels.productVariantId, invProductVariants.id),
      eq(invStockLevels.orgId, orgId),
    ))
    .where(eq(invProducts.orgId, orgId))
    .groupBy(
      invProducts.id,
      invProducts.name,
      invProducts.sku,
      invProducts.reorderPoint,
      invProducts.minStockLevel,
      invProductVariants.id,
      invProductVariants.name,
      invProductVariants.sku,
    )
    .having(
      sql`COALESCE(SUM(${invStockLevels.onHand}), 0) < ${invProducts.reorderPoint}`,
    )
    .orderBy(invProducts.name, invProductVariants.name);

  return rows.map((row) => {
    const onHand = Number(row.onHand ?? 0);
    const onOrder = Number(row.onOrder ?? 0);
    const reorderPoint = Number(row.reorderPoint);
    const deficit = Math.max(0, reorderPoint - onHand - onOrder);

    return {
      productId: row.productId,
      productName: row.productName,
      sku: row.sku,
      reorderPoint,
      minStockLevel: Number(row.minStockLevel),
      variantId: row.variantId,
      variantName: row.variantName,
      variantSku: row.variantSku,
      onHand,
      committed: Number(row.committed ?? 0),
      onOrder,
      deficit,
      urgency: onHand === 0 ? "critical" : onHand < Number(row.minStockLevel) ? "high" : "medium",
    };
  });
}

export async function getMovementsReport(orgId: string, fromDate: string, toDate: string) {
  const from = new Date(`${fromDate}T00:00:00.000Z`);
  const to = new Date(`${toDate}T23:59:59.999Z`);

  const rows = await db
    .select({
      id: invStockTransactions.id,
      transactionType: invStockTransactions.transactionType,
      quantityChange: invStockTransactions.quantityChange,
      quantityBefore: invStockTransactions.quantityBefore,
      quantityAfter: invStockTransactions.quantityAfter,
      referenceType: invStockTransactions.referenceType,
      referenceId: invStockTransactions.referenceId,
      notes: invStockTransactions.notes,
      createdAt: invStockTransactions.createdAt,
      variantId: invProductVariants.id,
      variantName: invProductVariants.name,
      variantSku: invProductVariants.sku,
      locationName: invLocations.name,
      locationCode: invLocations.code,
      warehouseName: invWarehouses.name,
    })
    .from(invStockTransactions)
    .innerJoin(invProductVariants, eq(invProductVariants.id, invStockTransactions.productVariantId))
    .innerJoin(invLocations, eq(invLocations.id, invStockTransactions.locationId))
    .innerJoin(invWarehouses, eq(invWarehouses.id, invLocations.warehouseId))
    .where(
      and(
        eq(invStockTransactions.orgId, orgId),
        gte(invStockTransactions.createdAt, from),
        lte(invStockTransactions.createdAt, to),
      ),
    )
    .orderBy(desc(invStockTransactions.createdAt));

  return rows.map((row) => ({
    id: row.id,
    transactionType: row.transactionType,
    quantityChange: Number(row.quantityChange),
    quantityBefore: Number(row.quantityBefore),
    quantityAfter: Number(row.quantityAfter),
    referenceType: row.referenceType,
    referenceId: row.referenceId,
    notes: row.notes,
    createdAt: row.createdAt,
    variant: {
      id: row.variantId,
      name: row.variantName,
      sku: row.variantSku,
    },
    location: {
      name: row.locationName,
      code: row.locationCode,
      warehouseName: row.warehouseName,
    },
  }));
}
