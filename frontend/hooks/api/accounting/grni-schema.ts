import { z } from "zod";

/**
 * ACC-03 — goods received into GRNI and not yet cleared by a bill
 * (`be/src/modules/accounting/adapters/reconciliation/dto/reconciliation-response.schemas.ts`).
 * Amounts are integers in the book's minor units; quantities are thousandths.
 */
const grniOpenLineContract = z.object({
  poLineId: z.number().int(),
  poId: z.number().int(),
  poNumber: z.string(),
  vendorName: z.string().nullable(),
  sku: z.string().nullable(),
  productName: z.string().nullable(),
  unitCost: z.string(),
  receivedMilli: z.number().int(),
  receivedMinor: z.number().int(),
  clearedMilli: z.number().int(),
  clearedMinor: z.number().int(),
  openMilli: z.number().int(),
  openMinor: z.number().int(),
  lastReceivedDate: z.string(),
});

export const grniOpenItemsContract = z.object({
  enabled: z.boolean(),
  orders: z.array(
    z.object({
      poId: z.number().int(),
      poNumber: z.string(),
      vendorName: z.string().nullable(),
      receivedMinor: z.number().int(),
      clearedMinor: z.number().int(),
      openMinor: z.number().int(),
      lastReceivedDate: z.string(),
      lines: z.array(grniOpenLineContract),
    }),
  ),
  totalOpenMinor: z.number().int(),
  truncated: z.boolean(),
});

export type GrniOpenLine = z.infer<typeof grniOpenLineContract>;
export type GrniOpenItemsReport = z.infer<typeof grniOpenItemsContract>;
