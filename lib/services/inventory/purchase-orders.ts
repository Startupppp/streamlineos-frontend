import { z } from "zod";
import { db } from "@/lib/db";
import { invPurchaseOrders, invPoLines, invGrns, invGrnLines } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

export const poLineSchema = z.object({
  productVariantId: z.number().int().positive(),
  quantity: z.number().positive().max(999999),
  unitCost: z.number().nonnegative().max(999999999.9999),
  taxRate: z.number().min(0).max(100).default(0),
  lineOrder: z.number().int().min(0).default(0),
});

export const createPurchaseOrderSchema = z.object({
  vendorId: z.number().int().positive(),
  orderDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expectedDeliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  warehouseId: z.number().int().positive().optional(),
  currency: z.string().length(3).default("INR"),
  notes: z.string().max(1000).optional(),
  lines: z.array(poLineSchema).min(1),
});

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;

export const listPurchaseOrdersSchema = z.object({
  status: z
    .enum(["DRAFT", "SENT", "PARTIAL", "RECEIVED", "CLOSED", "CANCELLED"])
    .optional(),
  vendorId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ListPurchaseOrdersInput = z.infer<typeof listPurchaseOrdersSchema>;

export const grnLineSchema = z.object({
  poLineId: z.number().int().positive(),
  quantityReceived: z.number().positive().max(999999),
  qualityStatus: z.enum(["ACCEPTED", "REJECTED"]).default("ACCEPTED"),
  rejectionReason: z.string().max(500).optional(),
});

export const receiveGoodsSchema = z.object({
  receivedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  locationId: z.number().int().positive().optional(),
  notes: z.string().max(1000).optional(),
  lines: z.array(grnLineSchema).min(1),
});

export type ReceiveGoodsInput = z.infer<typeof receiveGoodsSchema>;

const round4 = (n: number): number => Math.round(n * 10000) / 10000;

function computeTotals(lines: CreatePurchaseOrderInput["lines"]) {
  const subtotal = round4(
    lines.reduce((acc, l) => acc + l.quantity * l.unitCost, 0),
  );
  const taxAmount = round4(
    lines.reduce((acc, l) => {
      const lineAmount = l.quantity * l.unitCost;
      return acc + lineAmount * (l.taxRate / 100);
    }, 0),
  );
  const total = round4(subtotal + taxAmount);
  return { subtotal, taxAmount, total };
}

async function generatePoNumber(orgId: string): Promise<string> {
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(invPurchaseOrders)
    .where(eq(invPurchaseOrders.orgId, orgId));
  const seq = ((countResult?.count ?? 0) + 1).toString().padStart(4, "0");
  return `PO-${new Date().getFullYear()}-${seq}`;
}

async function generateGrnNumber(orgId: string): Promise<string> {
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(invGrns)
    .where(eq(invGrns.orgId, orgId));
  const seq = ((countResult?.count ?? 0) + 1).toString().padStart(4, "0");
  return `GRN-${new Date().getFullYear()}-${seq}`;
}

export async function createPurchaseOrder(
  orgId: string,
  userId: string,
  input: CreatePurchaseOrderInput,
) {
  const { subtotal, taxAmount, total } = computeTotals(input.lines);

  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || 'inv_po'))`,
    );

    const poNumber = await generatePoNumber(orgId);

    const [po] = await tx
      .insert(invPurchaseOrders)
      .values({
        orgId,
        vendorId: input.vendorId,
        poNumber,
        status: "DRAFT",
        orderDate: input.orderDate,
        expectedDeliveryDate: input.expectedDeliveryDate ?? null,
        warehouseId: input.warehouseId ?? null,
        subtotal: subtotal.toFixed(4),
        taxAmount: taxAmount.toFixed(4),
        discount: "0",
        total: total.toFixed(4),
        currency: input.currency,
        notes: input.notes ?? null,
        createdBy: userId,
      })
      .returning();

    await tx.insert(invPoLines).values(
      input.lines.map((line, idx) => ({
        poId: po.id,
        productVariantId: line.productVariantId,
        quantity: line.quantity.toFixed(4),
        quantityReceived: "0",
        unitCost: line.unitCost.toFixed(4),
        taxRate: line.taxRate.toFixed(2),
        amount: round4(line.quantity * line.unitCost).toFixed(4),
        lineOrder: line.lineOrder ?? idx,
      })),
    );

    return po;
  });
}

export async function sendPurchaseOrder(orgId: string, poId: number) {
  const [updated] = await db
    .update(invPurchaseOrders)
    .set({ status: "SENT", sentAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(invPurchaseOrders.id, poId),
        eq(invPurchaseOrders.orgId, orgId),
        eq(invPurchaseOrders.status, "DRAFT"),
      ),
    )
    .returning();

  return updated;
}

export async function receiveGoods(
  orgId: string,
  userId: string,
  poId: number,
  input: ReceiveGoodsInput,
) {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || 'inv_grn'))`,
    );

    const grnNumber = await generateGrnNumber(orgId);

    const [grn] = await tx
      .insert(invGrns)
      .values({
        orgId,
        poId,
        grnNumber,
        receivedDate: input.receivedDate,
        locationId: input.locationId ?? null,
        notes: input.notes ?? null,
        createdBy: userId,
      })
      .returning();

    await tx.insert(invGrnLines).values(
      input.lines.map((line) => ({
        grnId: grn.id,
        poLineId: line.poLineId,
        quantityReceived: line.quantityReceived.toFixed(4),
        qualityStatus: line.qualityStatus,
        rejectionReason: line.rejectionReason ?? null,
      })),
    );

    const acceptedLines = input.lines.filter((l) => l.qualityStatus === "ACCEPTED");
    for (const line of acceptedLines) {
      await tx
        .update(invPoLines)
        .set({
          quantityReceived: sql`${invPoLines.quantityReceived} + ${line.quantityReceived.toFixed(4)}::numeric`,
        })
        .where(eq(invPoLines.id, line.poLineId));
    }

    const po = await tx.query.invPurchaseOrders.findFirst({
      where: and(eq(invPurchaseOrders.id, poId), eq(invPurchaseOrders.orgId, orgId)),
      with: { lines: true },
    });

    if (po) {
      const allReceived = po.lines.every(
        (l) => Number(l.quantityReceived) >= Number(l.quantity),
      );
      const anyReceived = po.lines.some((l) => Number(l.quantityReceived) > 0);
      const newStatus = allReceived ? "RECEIVED" : anyReceived ? "PARTIAL" : po.status;

      if (newStatus !== po.status) {
        await tx
          .update(invPurchaseOrders)
          .set({ status: newStatus, updatedAt: new Date() })
          .where(eq(invPurchaseOrders.id, poId));
      }
    }

    return grn;
  });
}
