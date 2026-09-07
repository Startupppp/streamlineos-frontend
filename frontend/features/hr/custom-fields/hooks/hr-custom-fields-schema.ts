import { z } from "zod";

export const hrFieldDefContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  entityType: z.string(),
  name: z.string(),
  key: z.string(),
  fieldType: z.string(),
  options: z.array(z.object({ label: z.string(), value: z.string() })).nullable(),
  settings: z.record(z.string(), z.unknown()).nullable(),
  isSensitive: z.boolean(),
  isRequired: z.boolean(),
  isActive: z.boolean(),
  displayOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const hrFieldDefListContract = z.array(hrFieldDefContract);

export type HrFieldDef = z.infer<typeof hrFieldDefContract>;

export const hrFieldDefDeleteContract = z.undefined();
