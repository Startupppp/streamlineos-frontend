import { z } from "zod";
import type { CreateNurtureSequenceInput } from "@/types/crm/nurture";

export const nurtureSequenceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give the sequence a name")
    .max(120, "At most 120 characters"),
  description: z.string().trim().max(1000, "At most 1000 characters"),
});

export type NurtureSequenceFormValues = z.infer<typeof nurtureSequenceSchema>;

export function toCreateSequenceInput(
  values: NurtureSequenceFormValues,
): CreateNurtureSequenceInput {
  return {
    name: values.name,
    ...(values.description.length > 0 ? { description: values.description } : {}),
  };
}
