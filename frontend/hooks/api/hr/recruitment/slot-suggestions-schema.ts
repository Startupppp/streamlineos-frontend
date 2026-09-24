import { z } from "zod";

/**
 * Where the busy picture came from, carried on the wire rather than inferred.
 *
 * `streamline-only` means the slots avoid interviews this product knows about
 * and nothing else — an interviewer's dentist appointment is invisible to it.
 * A screen that showed those as plainly "free" would be promising more than
 * the data supports, which is why this field is required rather than optional.
 */
export const suggestedSlotsContract = z.object({
  slots: z.array(z.object({ start: z.string(), end: z.string() })),
  source: z.enum(["streamline-only", "calendar"]),
  blockedReason: z.string().nullable(),
  unseenMembershipIds: z.array(z.number().int()),
});

export type SuggestedSlots = z.infer<typeof suggestedSlotsContract>;
