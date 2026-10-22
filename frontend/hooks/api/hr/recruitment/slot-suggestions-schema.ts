import { z } from "zod";

export const suggestedSlotsContract = z.object({
  slots: z.array(z.object({ start: z.string(), end: z.string() })),
  source: z.enum(["streamline-only", "calendar"]),
  blockedReason: z.string().nullable(),
  unseenMembershipIds: z.array(z.number().int()),
});

export type SuggestedSlots = z.infer<typeof suggestedSlotsContract>;
