import { z } from "zod";

export const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const checkInInputSchema = z.object({
  location: locationSchema.optional(),
});
