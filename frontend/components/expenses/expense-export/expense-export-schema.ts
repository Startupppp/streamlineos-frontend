import { z } from "zod";

const wireDate = () => z.string();
const nullableWireDate = () => z.string().nullable();

export const expenseExportJobContract = z.object({
  id: z.string(),
  status: z.enum(["pending", "running", "completed", "failed", "expired"]),
  processedRows: z.number().int(),
  rowCount: z.number().int().nullable(),
  truncated: z.boolean(),
  fileName: z.string().nullable(),
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: wireDate(),
  completedAt: nullableWireDate(),
  expiresAt: nullableWireDate(),
});
