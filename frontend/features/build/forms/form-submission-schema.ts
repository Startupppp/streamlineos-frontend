import { z } from "zod";

export const formFieldContract = z.object({
  key: z.string(),
  label: z.string(),
  type: z.string(),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
});

export type FormField = z.infer<typeof formFieldContract>;

/**
 * The public form read, validated rather than asserted. The cast this replaces
 * (`res.json() as Promise<PublicFormDefinition>`) skipped the `{ success, data }`
 * envelope that the backend's global ResponseTransformInterceptor adds to every
 * handler return, so `form.fields` was always undefined: the header stayed on
 * "Loading form…" and `form.fields.length` threw. Reading through
 * `parseApiResponse` unwraps the envelope; the contract is what makes the next
 * shape change an error instead of a blank page.
 */
export const publicFormDefinitionContract = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  type: z.string(),
  fields: z.array(formFieldContract),
  publicToken: z.string().nullable().optional(),
});

export type PublicFormDefinition = z.infer<typeof publicFormDefinitionContract>;

export const publicFormSubmitResponseContract = z.object({
  id: z.number(),
  message: z.string(),
});

export type PublicFormSubmitResponse = z.infer<
  typeof publicFormSubmitResponseContract
>;

type StringSchema = z.ZodString;

export function buildFieldSchema(field: FormField): StringSchema {
  if (field.type === "email") {
    return field.required
      ? z.string().trim().min(1, `${field.label} is required`).email(`${field.label} must be a valid email`)
      : z.string().trim().refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
          message: `${field.label} must be a valid email`,
        });
  }
  if (field.type === "number") {
    return field.required
      ? z.string().trim().min(1, `${field.label} is required`).refine((v) => /^-?\d+(\.\d+)?$/.test(v), {
          message: `${field.label} must be a number`,
        })
      : z.string().trim().refine((v) => v === "" || /^-?\d+(\.\d+)?$/.test(v), {
          message: `${field.label} must be a number`,
        });
  }
  if (field.required) {
    return z.string().trim().min(1, `${field.label} is required`);
  }
  return z.string();
}

export function buildDynamicSchema(fields: FormField[]): z.ZodObject<Record<string, StringSchema>> {
  const shape: Record<string, StringSchema> = {};
  for (const field of fields) {
    shape[field.key] = buildFieldSchema(field);
  }
  return z.object(shape);
}
