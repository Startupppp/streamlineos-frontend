import { z } from "zod";
import { regularizationRowContract } from "@/hooks/api/hr/attendance-schema";

export const regularizationQueueContract = z.object({
  data: z.array(regularizationRowContract),
  pagination: z.object({
    limit: z.number(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const regularizationApplyContract = z.object({
  success: z.literal(true),
  monthKey: z.string(),
  payrollInputRebuild: z.boolean(),
});

export const regularizationRejectContract = z.object({
  success: z.literal(true),
});
