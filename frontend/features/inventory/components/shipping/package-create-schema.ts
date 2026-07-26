import { z } from "zod";

export const packageCreateSchema = z.object({
  shipmentId: z.number().int().positive().optional(),
});

export type PackageCreateValues = z.infer<typeof packageCreateSchema>;
