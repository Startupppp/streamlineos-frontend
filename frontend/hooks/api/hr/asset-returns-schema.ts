import { z } from "zod";

export const assetReturnContract = z.object({
  id: z.number(),
  orgId: z.string(),
  userId: z.string(),
  assetId: z.number().nullable(),
  assetName: z.string(),
  assetType: z.string().nullable(),
  serialNumber: z.string().nullable(),
  status: z.string(),
  returnedAt: z.string().nullable(),
  condition: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  employeeName: z.string().nullable(),
});

export const assetReturnListContract = z.array(assetReturnContract);

export const assetReturnSuccessContract = z.object({ success: z.boolean() });
