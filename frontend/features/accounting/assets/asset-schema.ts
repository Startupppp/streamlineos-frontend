import { z } from "zod";

export const disposeAssetSchema = z.object({
  disposalDate: z.string().min(1, "Date is required"),
  amount: z.string().min(1, "Proceeds amount is required"),
});

export type DisposeFormValues = z.infer<typeof disposeAssetSchema>;
