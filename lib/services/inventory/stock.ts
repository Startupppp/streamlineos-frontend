import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  invStockAdjustments,
  invStockAdjustmentLines,
  invStockLevels,
  invStockTransactions,
  invStockTransfers,
  invStockTransferLines,
} from "@/lib/db/schema";

export type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const listStockLevelsSchema = z.object({
  warehouseId: z.coerce.number().int().positive().optional(),
  productId: z.coerce.number().int().positive().optional(),
  lowStock: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const listTransactionsSchema = z.object({
  productVariantId: z.coerce.number().int().positive().optional(),
  locationId: z.coerce.number().int().positive().optional(),
  transactionType: z
    .enum([
      "PURCHASE",
      "SALE",
      "ADJUSTMENT_IN",
      "ADJUSTMENT_OUT",
      "TRANSFER_IN",
      "TRANSFER_OUT",
      "RETURN_IN",
      "RETURN_OUT",
      "GRN",
    ])
    .optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const createAdjustmentSchema = z.object({
  reason: z.enum([
    "PURCHASE",
    "SALE",
    "RETURN",
    "DAMAGE",
    "EXPIRY",
    "THEFT",
    "RECOUNT",
    "OTHER",
  ]),
  notes: z.string().max(1000).optional(),
  lines: z
    .array(
      z.object({
        productVariantId: z.number().int().positive(),
        locationId: z.number().int().positive(),
        quantityChange: z
          .number()
          .refine((v) => v !== 0, "Quantity change cannot be zero"),
        notes: z.string().max(500).optional(),
      })
    )
    .min(1),
});

export const listTransfersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const createTransferSchema = z
  .object({
    fromLocationId: z.number().int().positive(),
    toLocationId: z.number().int().positive(),
    notes: z.string().max(1000).optional(),
    lines: z
      .array(
        z.object({
          productVariantId: z.number().int().positive(),
          quantity: z.number().positive(),
        })
      )
      .min(1),
  })
  .refine((v) => v.fromLocationId !== v.toLocationId, {
    message: "Source and destination locations must differ",
    path: ["toLocationId"],
  });

export const completeTransferSchema = z.object({
  lines: z
    .array(
      z.object({
        transferLineId: z.number().int().positive(),
        quantityReceived: z.number().min(0),
      })
    )
    .min(1),
});

export type ListStockLevelsInput = z.infer<typeof listStockLevelsSchema>;
export type ListTransactionsInput = z.infer<typeof listTransactionsSchema>;
export type CreateAdjustmentInput = z.infer<typeof createAdjustmentSchema>;
export type ListTransfersInput = z.infer<typeof listTransfersSchema>;
export type CreateTransferInput = z.infer<typeof createTransferSchema>;
export type CompleteTransferInput = z.infer<typeof completeTransferSchema>;

async function generateAdjustmentRef(orgId: string, tx: DbTx): Promise<string> {
  const [result] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(invStockAdjustments)
    .where(eq(invStockAdjustments.orgId, orgId));
  const next = (result?.count ?? 0) + 1;
  return `ADJ-${new Date().getFullYear()}-${String(next).padStart(4, "0")}`;
}

async function generateTransferRef(orgId: string, tx: DbTx): Promise<string> {
  const [result] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(invStockTransfers)
    .where(eq(invStockTransfers.orgId, orgId));
  const next = (result?.count ?? 0) + 1;
  return `TRF-${new Date().getFullYear()}-${String(next).padStart(4, "0")}`;
}

async function upsertStockLevel(
  tx: DbTx,
  orgId: string,
  productVariantId: number,
  locationId: number,
  delta: number
): Promise<{ before: string; after: string }> {
  let level = await tx.query.invStockLevels.findFirst({
    where: and(
      eq(invStockLevels.orgId, orgId),
      eq(invStockLevels.productVariantId, productVariantId),
      eq(invStockLevels.locationId, locationId)
    ),
  });

  if (!level) {
    const [inserted] = await tx
      .insert(invStockLevels)
      .values({
        orgId,
        productVariantId,
        locationId,
        onHand: "0",
        committed: "0",
        onOrder: "0",
      })
      .returning();
    level = inserted;
  }

  const before = parseFloat(level.onHand);
  const after = before + delta;

  await tx
    .update(invStockLevels)
    .set({ onHand: after.toFixed(4) })
    .where(
      and(
        eq(invStockLevels.orgId, orgId),
        eq(invStockLevels.productVariantId, productVariantId),
        eq(invStockLevels.locationId, locationId)
      )
    );

  return { before: before.toFixed(4), after: after.toFixed(4) };
}

export async function createStockAdjustment(
  orgId: string,
  userId: string,
  input: CreateAdjustmentInput
) {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || 'stock_adj'))`
    );

    const referenceNumber = await generateAdjustmentRef(orgId, tx);

    const [adjustment] = await tx
      .insert(invStockAdjustments)
      .values({
        orgId,
        referenceNumber,
        reason: input.reason,
        notes: input.notes ?? null,
        status: "POSTED",
        createdBy: userId,
      })
      .returning();

    const lines = await tx
      .insert(invStockAdjustmentLines)
      .values(
        input.lines.map((line) => ({
          adjustmentId: adjustment.id,
          productVariantId: line.productVariantId,
          locationId: line.locationId,
          quantityChange: line.quantityChange.toFixed(4),
          notes: line.notes ?? null,
        }))
      )
      .returning();

    for (const line of input.lines) {
      const txnType =
        line.quantityChange > 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT";
      const { before, after } = await upsertStockLevel(
        tx,
        orgId,
        line.productVariantId,
        line.locationId,
        line.quantityChange
      );

      await tx.insert(invStockTransactions).values({
        orgId,
        productVariantId: line.productVariantId,
        locationId: line.locationId,
        transactionType: txnType,
        quantityChange: line.quantityChange.toFixed(4),
        quantityBefore: before,
        quantityAfter: after,
        referenceType: "adjustment",
        referenceId: String(adjustment.id),
        notes: line.notes ?? null,
        createdBy: userId,
      });
    }

    return { adjustment, lines };
  });
}

export async function createStockTransfer(
  orgId: string,
  userId: string,
  input: CreateTransferInput
) {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || 'stock_transfer'))`
    );

    const referenceNumber = await generateTransferRef(orgId, tx);

    const [transfer] = await tx
      .insert(invStockTransfers)
      .values({
        orgId,
        referenceNumber,
        fromLocationId: input.fromLocationId,
        toLocationId: input.toLocationId,
        status: "PENDING",
        notes: input.notes ?? null,
        createdBy: userId,
      })
      .returning();

    const lines = await tx
      .insert(invStockTransferLines)
      .values(
        input.lines.map((line) => ({
          transferId: transfer.id,
          productVariantId: line.productVariantId,
          quantity: line.quantity.toFixed(4),
          quantityReceived: "0",
        }))
      )
      .returning();

    return { transfer, lines };
  });
}

export async function completeStockTransfer(
  orgId: string,
  userId: string,
  transferId: number,
  input: CompleteTransferInput
) {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || 'stock_transfer'))`
    );

    const transfer = await tx.query.invStockTransfers.findFirst({
      where: and(
        eq(invStockTransfers.id, transferId),
        eq(invStockTransfers.orgId, orgId)
      ),
      with: { lines: true },
    });

    if (!transfer) throw new Error("Transfer not found");
    if (transfer.status !== "PENDING" && transfer.status !== "IN_TRANSIT") {
      throw new Error(
        `Transfer cannot be completed in status: ${transfer.status}`
      );
    }

    for (const receivedLine of input.lines) {
      await tx
        .update(invStockTransferLines)
        .set({ quantityReceived: receivedLine.quantityReceived.toFixed(4) })
        .where(eq(invStockTransferLines.id, receivedLine.transferLineId));
    }

    const lineMap = new Map(transfer.lines.map((l) => [l.id, l]));

    for (const receivedLine of input.lines) {
      const transferLine = lineMap.get(receivedLine.transferLineId);
      if (!transferLine) continue;

      const qtyOut = parseFloat(transferLine.quantity);
      const qtyIn = receivedLine.quantityReceived;

      const { before: outBefore, after: outAfter } = await upsertStockLevel(
        tx,
        orgId,
        transferLine.productVariantId,
        transfer.fromLocationId,
        -qtyOut
      );
      await tx.insert(invStockTransactions).values({
        orgId,
        productVariantId: transferLine.productVariantId,
        locationId: transfer.fromLocationId,
        transactionType: "TRANSFER_OUT",
        quantityChange: (-qtyOut).toFixed(4),
        quantityBefore: outBefore,
        quantityAfter: outAfter,
        referenceType: "transfer",
        referenceId: String(transferId),
        notes: null,
        createdBy: userId,
      });

      const { before: inBefore, after: inAfter } = await upsertStockLevel(
        tx,
        orgId,
        transferLine.productVariantId,
        transfer.toLocationId,
        qtyIn
      );
      await tx.insert(invStockTransactions).values({
        orgId,
        productVariantId: transferLine.productVariantId,
        locationId: transfer.toLocationId,
        transactionType: "TRANSFER_IN",
        quantityChange: qtyIn.toFixed(4),
        quantityBefore: inBefore,
        quantityAfter: inAfter,
        referenceType: "transfer",
        referenceId: String(transferId),
        notes: null,
        createdBy: userId,
      });
    }

    const [updated] = await tx
      .update(invStockTransfers)
      .set({ status: "COMPLETED", completedAt: new Date() })
      .where(
        and(
          eq(invStockTransfers.id, transferId),
          eq(invStockTransfers.orgId, orgId)
        )
      )
      .returning();

    return updated;
  });
}
