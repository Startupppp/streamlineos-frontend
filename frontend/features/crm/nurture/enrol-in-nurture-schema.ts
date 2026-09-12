import { z } from "zod";
import type { EnrolInNurtureSequenceInput } from "@/types/crm/nurture";

/**
 * Who to nurture, and what about.
 *
 * `dealId` is digits only and a string on the wire: the column is an `integer`
 * with a foreign key to `deals.id`, so a non-numeric value reaches Postgres as a
 * `22P02` and surfaces as a 500 rather than as the 400 it is. The form carries
 * `""` for "no deal" and drops the key rather than sending a blank, because the
 * body is `.strict()`.
 */
const DEAL_ID = /^[0-9]{1,9}$/;

export const enrolInNurtureSchema = z.object({
  partyId: z
    .string()
    .trim()
    .min(1, "Choose the customer to nurture")
    .max(64, "That is not a customer this organisation holds"),
  dealId: z
    .string()
    .trim()
    .refine((value) => value === "" || DEAL_ID.test(value), "Choose a deal from the list"),
});

export type EnrolInNurtureFormValues = z.infer<typeof enrolInNurtureSchema>;

export function toEnrolInput(values: EnrolInNurtureFormValues): EnrolInNurtureSequenceInput {
  return {
    partyId: values.partyId,
    ...(values.dealId.length > 0 ? { dealId: values.dealId } : {}),
  };
}
