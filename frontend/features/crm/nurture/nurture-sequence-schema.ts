import { z } from "zod";
import type { CreateNurtureSequenceInput } from "@/types/crm/nurture";

/**
 * A sequence is a name and a cadence, and this half is only the name.
 *
 * The bounds are `createNurtureSequenceSchema`'s: 120 and 1000. Names are
 * unique per tenant case-insensitively, which the server enforces and reports
 * as a 409 — not repeated here, because a client-side uniqueness check would be
 * a second answer that can disagree with the index.
 */
export const nurtureSequenceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give the sequence a name")
    .max(120, "At most 120 characters"),
  description: z.string().trim().max(1000, "At most 1000 characters"),
});

export type NurtureSequenceFormValues = z.infer<typeof nurtureSequenceSchema>;

/** An empty description is omitted rather than sent as `""`; the body is strict. */
export function toCreateSequenceInput(
  values: NurtureSequenceFormValues,
): CreateNurtureSequenceInput {
  return {
    name: values.name,
    ...(values.description.length > 0 ? { description: values.description } : {}),
  };
}
