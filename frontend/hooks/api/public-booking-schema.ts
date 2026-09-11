import { z } from "zod";

const availableSlotSchema = z.object({
  start: z.string(),
  end: z.string(),
});

export const interviewBookingDataContract = z.object({
  candidateName: z.string(),
  orgName: z.string(),
  interviewType: z.string(),
  durationMinutes: z.number().int(),
  availableSlots: z.array(availableSlotSchema),
  notes: z.string().nullable(),
});

export const confirmBookingContract = z.object({
  success: z.literal(true),
  interviewId: z.number().int(),
});
