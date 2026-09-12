import { z } from "zod";

export const fxRateFormSchema = z.object({
  fromCode: z.string().length(3, "Pick a currency"),
  toCode: z.string().length(3, "Pick a currency"),
  rateDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  rate: z
    .string()
    .refine((value) => Number(value) > 0, "The rate must be greater than zero"),
});

export type FxRateFormValues = z.infer<typeof fxRateFormSchema>;
