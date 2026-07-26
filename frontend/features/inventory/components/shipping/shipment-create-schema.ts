import { z } from "zod";

export const shipmentCreateSchema = z.object({
  soId: z.number().int().positive().optional(),
  notes: z.string().max(500).optional(),
});

export type ShipmentCreateValues = z.infer<typeof shipmentCreateSchema>;
