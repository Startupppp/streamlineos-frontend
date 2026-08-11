import { z } from "zod";

export const territorySchema = z.object({
  name: z.string().min(1, "Name required").max(100),
  description: z.string().optional(),
  priority: z
    .string()
    .refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Must be ≥ 0"),
  isActive: z.boolean(),
  countries: z.array(z.string()),
  states: z.array(z.string()),
  cities: z.array(z.string()),
  postalCodes: z.array(z.string()),
  industries: z.array(z.string()),
  companySizes: z.array(z.string()),
  productKeys: z.array(z.string()),
  accountTypes: z.array(z.string()),
});

export type TerritoryFormValues = z.infer<typeof territorySchema>;
