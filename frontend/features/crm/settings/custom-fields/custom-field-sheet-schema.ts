import { z } from "zod";

export const customFieldOptionSchema = z.object({
  value: z.string().min(1, "Value required"),
  label: z.string().min(1, "Label required"),
});

export const customFieldSchema = z.object({
  label: z.string().min(1, "Label is required").max(100),
  fieldType: z.enum(["text", "number", "date", "boolean", "select"]),
  isRequired: z.boolean(),
  options: z.array(customFieldOptionSchema),
});

export type CustomFieldFormValues = z.infer<typeof customFieldSchema>;

/** The stored key a label becomes. Derived rather than asked for: a person who
 *  has already typed "Lead source" should not then be asked for `lead_source`. */
export function labelToName(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}
