import { z } from "zod";
import { db } from "@/lib/db";
import {
  invSalesOrders,
  invSoLines,
  invStockLevels,
  invStockTransactions,
  invLocations,
  invProductVariants,
  invoices,
  invoiceItems,
} from "@/lib/db/schema";
import { eq, and, sql, inArray, sum } from "drizzle-orm";

export class SoHttpError extends Error {
  constructor(
    message: string,
    public readonly httpStatus: 400 | 404 | 409 | 422 | 500,
  ) {
    super(message);
    this.name = "SoHttpError";
  }
}

export function isSoHttpError(e: unknown): e is SoHttpError {
  return e instanceof SoHttpError;
}

export const listSalesOrdersSchema = z.object({
  status: z.enum(["DRAFT", "CONFIRMED", "SHIPPED", "INVOICED", "CANCELLED"]).optional(),
  clientId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ListSalesOrdersInput = z.infer<typeof listSalesOrdersSchema>;

const soLineSchema = z.object({
  productVariantId: z.number().int().positive(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  taxRate: z.number().min(0).max(100).default(0),
  lineOrder: z.number().int().min(0).default(0),
});

export const createSalesOrderSchema = z.object({
  clientId: z.number().int().positive().optional(),
  warehouseId: z.number().int().positive().optional(),
  orderDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  requiredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  shippingAddress: z.string().max(500).optional(),
  currency: z.string().length(3).default("INR"),
  notes: z.string().max(1000).optional(),
  lines: z.array(soLineSchema).min(1),
});

export type CreateSalesOrderInput = z.infer<typeof createSalesOrderSchema>;

export const shipSalesOrderSchema = z.object({
  shipDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(1000).optional(),
});

export type ShipSalesOrderInput = z.infer<typeof shipSalesOrderSchema>;

const round4 = (n: number) => Math.round(n * 10000) / 10000;

export async function createSalesOrder(orgId: string, userId: string, input: CreateSalesOrderInput) {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || 'inv_so'))`,
    );

    const [countResult] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(invSalesOrders)
      .where(eq(invSalesOrders.orgId, orgId));

    const nextNum = (countResult?.count ?? 0) + 1;
    const year = new Date().getFullYear();
    const soNumber = `SO-${year}-${String(nextNum).padStart(4, "0")}`;

    const linesWithAmounts = input.lines.map((line) => {
      const baseAmount = round4(line.quantity * line.unitPrice);
      const taxAmt = round4(baseAmount * (line.taxRate / 100));
      return { ...line, baseAmount, taxAmt };
    });

    const subtotal = round4(linesWithAmounts.reduce((acc, l) => acc + l.baseAmount, 0));
    const taxAmount = round4(linesWithAmounts.reduce((acc, l) => acc + l.taxAmt, 0));
    const total = round4(subtotal + taxAmount);

    const [so] = await tx
      .insert(invSalesOrders)
      .values({
        orgId,
        clientId: input.clientId ?? null,
        warehouseId: input.warehouseId ?? null,
        soNumber,
        status: "DRAFT",
        orderDate: input.orderDate,
        requiredDate: input.requiredDate ?? null,
        shippingAddress: input.shippingAddress ?? null,
        currency: input.currency,
        notes: input.notes ?? null,
        subtotal: subtotal.toFixed(4),
        taxAmount: taxAmount.toFixed(4),
        discount: "0",
        total: total.toFixed(4),
        createdBy: userId,
      })
      .returning();

    if (!so) throw new Error("Sales order insert returned no rows");

    await tx.insert(invSoLines).values(
      linesWithAmounts.map((line) => ({
        soId: so.id,
        productVariantId: line.productVariantId,
        quantity: line.quantity.toFixed(4),
        quantityShipped: "0",
        unitPrice: line.unitPrice.toFixed(4),
        taxRate: line.taxRate.toFixed(2),
        amount: line.baseAmount.toFixed(4),
        costAtTime: "0",
        lineOrder: line.lineOrder,
      })),
    );

    return so;
  });
}

export async function confirmSalesOrder(orgId: string, soId: number) {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select({
        id: invSalesOrders.id,
        status: invSalesOrders.status,
        warehouseId: invSalesOrders.warehouseId,
      })
      .from(invSalesOrders)
      .where(and(eq(invSalesOrders.id, soId), eq(invSalesOrders.orgId, orgId)))
      .limit(1);

    const so = rows[0];
    if (!so) throw new SoHttpError("Sales order not found", 404);
    if (so.status !== "DRAFT") throw new SoHttpError("Only DRAFT orders can be confirmed", 409);

    const soLines = await tx
      .select({
        productVariantId: invSoLines.productVariantId,
        quantity: invSoLines.quantity,
      })
      .from(invSoLines)
      .where(eq(invSoLines.soId, soId));

    if (so.warehouseId) {
      const locationRows = await tx
        .select({ id: invLocations.id })
        .from(invLocations)
        .where(and(eq(invLocations.warehouseId, so.warehouseId), eq(invLocations.isActive, true)))
        .limit(1);

      const locationId = locationRows[0]?.id;

      if (locationId) {
        for (const line of soLines) {
          await tx
            .insert(invStockLevels)
            .values({
              orgId,
              productVariantId: line.productVariantId,
              locationId,
              onHand: "0",
              committed: line.quantity,
              onOrder: "0",
            })
            .onConflictDoUpdate({
              target: [invStockLevels.productVariantId, invStockLevels.locationId],
              set: {
                committed: sql`${invStockLevels.committed} + ${line.quantity}`,
                updatedAt: new Date(),
              },
            });
        }
      }
    }

    const [updated] = await tx
      .update(invSalesOrders)
      .set({ status: "CONFIRMED", confirmedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(invSalesOrders.id, soId), eq(invSalesOrders.orgId, orgId)))
      .returning();

    if (!updated) throw new SoHttpError("Failed to update sales order", 500);

    return updated;
  });
}

export async function shipSalesOrder(
  orgId: string,
  soId: number,
  input: ShipSalesOrderInput,
  userId: string,
) {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select({
        id: invSalesOrders.id,
        status: invSalesOrders.status,
        warehouseId: invSalesOrders.warehouseId,
      })
      .from(invSalesOrders)
      .where(and(eq(invSalesOrders.id, soId), eq(invSalesOrders.orgId, orgId)))
      .limit(1);

    const so = rows[0];
    if (!so) throw new SoHttpError("Sales order not found", 404);
    if (so.status !== "CONFIRMED") throw new SoHttpError("Only CONFIRMED orders can be shipped", 409);

    const soLines = await tx
      .select({
        id: invSoLines.id,
        productVariantId: invSoLines.productVariantId,
        quantity: invSoLines.quantity,
      })
      .from(invSoLines)
      .where(eq(invSoLines.soId, soId));

    if (so.warehouseId) {
      const locationRows = await tx
        .select({ id: invLocations.id })
        .from(invLocations)
        .where(and(eq(invLocations.warehouseId, so.warehouseId), eq(invLocations.isActive, true)))
        .limit(1);

      const locationId = locationRows[0]?.id;

      if (locationId) {
        for (const line of soLines) {
          const qty = Number(line.quantity);

          const currentLevels = await tx
            .select({ onHand: invStockLevels.onHand })
            .from(invStockLevels)
            .where(
              and(
                eq(invStockLevels.productVariantId, line.productVariantId),
                eq(invStockLevels.locationId, locationId),
              ),
            )
            .limit(1);

          const beforeQty = Number(currentLevels[0]?.onHand ?? 0);
          const afterQty = Math.max(0, beforeQty - qty);

          await tx
            .insert(invStockLevels)
            .values({
              orgId,
              productVariantId: line.productVariantId,
              locationId,
              onHand: afterQty.toFixed(4),
              committed: "0",
              onOrder: "0",
            })
            .onConflictDoUpdate({
              target: [invStockLevels.productVariantId, invStockLevels.locationId],
              set: {
                onHand: sql`GREATEST(0, ${invStockLevels.onHand} - ${line.quantity})`,
                committed: sql`GREATEST(0, ${invStockLevels.committed} - ${line.quantity})`,
                updatedAt: new Date(),
              },
            });

          await tx.insert(invStockTransactions).values({
            orgId,
            productVariantId: line.productVariantId,
            locationId,
            transactionType: "SALE",
            quantityChange: (-qty).toFixed(4),
            quantityBefore: beforeQty.toFixed(4),
            quantityAfter: afterQty.toFixed(4),
            referenceType: "SO",
            referenceId: String(soId),
            notes: input.notes ?? null,
            createdBy: userId,
          });
        }
      }
    }

    await tx
      .update(invSoLines)
      .set({ quantityShipped: invSoLines.quantity })
      .where(eq(invSoLines.soId, soId));

    const [updated] = await tx
      .update(invSalesOrders)
      .set({
        status: "SHIPPED",
        shippedAt: new Date(input.shipDate),
        notes: input.notes ?? undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(invSalesOrders.id, soId), eq(invSalesOrders.orgId, orgId)))
      .returning();

    if (!updated) throw new SoHttpError("Failed to update sales order", 500);

    return updated;
  });
}

export async function invoiceSalesOrder(orgId: string, soId: number, userId: string) {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || 'invoice'))`,
    );

    const rows = await tx
      .select({
        id: invSalesOrders.id,
        status: invSalesOrders.status,
        clientId: invSalesOrders.clientId,
        subtotal: invSalesOrders.subtotal,
        taxAmount: invSalesOrders.taxAmount,
        discount: invSalesOrders.discount,
        total: invSalesOrders.total,
        currency: invSalesOrders.currency,
        notes: invSalesOrders.notes,
        invoiceId: invSalesOrders.invoiceId,
      })
      .from(invSalesOrders)
      .where(and(eq(invSalesOrders.id, soId), eq(invSalesOrders.orgId, orgId)))
      .limit(1);

    const so = rows[0];
    if (!so) throw new SoHttpError("Sales order not found", 404);
    if (so.status !== "SHIPPED") throw new SoHttpError("Only SHIPPED orders can be invoiced", 409);
    if (so.invoiceId) throw new SoHttpError("Sales order is already invoiced", 409);

    const soLinesWithVariants = await tx
      .select({
        quantity: invSoLines.quantity,
        unitPrice: invSoLines.unitPrice,
        amount: invSoLines.amount,
        lineOrder: invSoLines.lineOrder,
        variantName: invProductVariants.name,
        variantSku: invProductVariants.sku,
      })
      .from(invSoLines)
      .innerJoin(invProductVariants, eq(invProductVariants.id, invSoLines.productVariantId))
      .where(eq(invSoLines.soId, soId));

    const legacyLineItems = soLinesWithVariants.map((line) => ({
      description: `${line.variantName} (${line.variantSku})`,
      quantity: Number(line.quantity),
      rate: Number(line.unitPrice),
      amount: Number(line.amount),
    }));

    const [countResult] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(invoices)
      .where(eq(invoices.orgId, orgId));

    const nextNum = (countResult?.count ?? 0) + 1;
    const year = new Date().getFullYear();
    const invoiceNumber = `INV-${year}-${String(nextNum).padStart(4, "0")}`;

    const [invoice] = await tx
      .insert(invoices)
      .values({
        orgId,
        clientId: so.clientId ?? null,
        invoiceNumber,
        status: "SENT",
        lineItems: legacyLineItems,
        subtotal: so.subtotal,
        taxRate: "0",
        taxAmount: so.taxAmount,
        discount: so.discount,
        total: so.total,
        currency: so.currency,
        notes: so.notes ?? null,
        sentAt: new Date(),
        createdBy: userId,
      })
      .returning();

    if (!invoice) throw new Error("Invoice insert returned no rows");

    if (soLinesWithVariants.length > 0) {
      await tx.insert(invoiceItems).values(
        soLinesWithVariants.map((line, idx) => ({
          invoiceId: invoice.id,
          description: `${line.variantName} (${line.variantSku})`,
          quantity: line.quantity,
          rate: line.unitPrice,
          gstRate: "0.00",
          amount: line.amount,
          lineOrder: line.lineOrder ?? idx,
        })),
      );
    }

    const [updated] = await tx
      .update(invSalesOrders)
      .set({ status: "INVOICED", invoiceId: invoice.id, updatedAt: new Date() })
      .where(and(eq(invSalesOrders.id, soId), eq(invSalesOrders.orgId, orgId)))
      .returning();

    if (!updated) throw new SoHttpError("Failed to update sales order", 500);

    return { salesOrder: updated, invoice };
  });
}

export async function getAtpForSalesOrder(orgId: string, soId: number) {
  const soRows = await db
    .select({ id: invSalesOrders.id, warehouseId: invSalesOrders.warehouseId })
    .from(invSalesOrders)
    .where(and(eq(invSalesOrders.id, soId), eq(invSalesOrders.orgId, orgId)))
    .limit(1);

  const so = soRows[0];
  if (!so) return null;

  const soLines = await db
    .select({
      id: invSoLines.id,
      productVariantId: invSoLines.productVariantId,
      quantity: invSoLines.quantity,
      variantName: invProductVariants.name,
      variantSku: invProductVariants.sku,
    })
    .from(invSoLines)
    .innerJoin(invProductVariants, eq(invProductVariants.id, invSoLines.productVariantId))
    .where(eq(invSoLines.soId, soId));

  const variantIds = [...new Set(soLines.map((l) => l.productVariantId))];

  if (variantIds.length === 0) {
    return { soId, warehouseId: so.warehouseId ?? null, lines: [] };
  }

  let stockMap: Map<number, { onHand: string | null; committed: string | null }>;

  if (so.warehouseId) {
    const locationRows = await db
      .select({ id: invLocations.id })
      .from(invLocations)
      .where(and(eq(invLocations.warehouseId, so.warehouseId), eq(invLocations.isActive, true)));

    const locationIds = locationRows.map((r) => r.id);

    if (locationIds.length === 0) {
      return {
        soId,
        warehouseId: so.warehouseId,
        lines: soLines.map((line) => ({
          lineId: line.id,
          productVariantId: line.productVariantId,
          variantName: line.variantName,
          variantSku: line.variantSku,
          required: Number(line.quantity),
          onHand: 0,
          committed: 0,
          available: 0,
          canFulfill: false,
        })),
      };
    }

    const stockRows = await db
      .select({
        productVariantId: invStockLevels.productVariantId,
        onHand: sum(invStockLevels.onHand),
        committed: sum(invStockLevels.committed),
      })
      .from(invStockLevels)
      .where(
        and(
          inArray(invStockLevels.productVariantId, variantIds),
          inArray(invStockLevels.locationId, locationIds),
        ),
      )
      .groupBy(invStockLevels.productVariantId);

    stockMap = new Map(stockRows.map((r) => [r.productVariantId, r]));
  } else {
    const stockRows = await db
      .select({
        productVariantId: invStockLevels.productVariantId,
        onHand: sum(invStockLevels.onHand),
        committed: sum(invStockLevels.committed),
      })
      .from(invStockLevels)
      .where(
        and(
          inArray(invStockLevels.productVariantId, variantIds),
          eq(invStockLevels.orgId, orgId),
        ),
      )
      .groupBy(invStockLevels.productVariantId);

    stockMap = new Map(stockRows.map((r) => [r.productVariantId, r]));
  }

  return {
    soId,
    warehouseId: so.warehouseId ?? null,
    lines: soLines.map((line) => {
      const stock = stockMap.get(line.productVariantId);
      const onHand = Number(stock?.onHand ?? 0);
      const committed = Number(stock?.committed ?? 0);
      const available = Math.max(0, onHand - committed);
      const required = Number(line.quantity);
      return {
        lineId: line.id,
        productVariantId: line.productVariantId,
        variantName: line.variantName,
        variantSku: line.variantSku,
        required,
        onHand,
        committed,
        available,
        canFulfill: available >= required,
      };
    }),
  };
}
