import { z } from "zod";

export const dockBookingSchema = z.object({
  doorId: z.string().min(1, "Choose a door"),
  windowStart: z.string().min(1, "Enter the start time"),
  windowEnd: z.string().min(1, "Enter the end time"),
  carrierName: z.string(),
});

export type DockBookingValues = z.infer<typeof dockBookingSchema>;
