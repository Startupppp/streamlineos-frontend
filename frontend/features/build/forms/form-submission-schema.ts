import { z } from "zod";

export const formFieldContract = z.object({
  key: z.string(),
  label: z.string(),
  type: z.string(),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
});

export type FormField = z.infer<typeof formFieldContract>;


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

const NUMERIC_RE = /^-?\d+(\.\d+)?$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isHttpsUrl(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function buildFieldSchema(field: FormField): z.ZodTypeAny {
  const { label, type, required, options } = field;

  if (type === "checkbox") {
    return required
      ? z.boolean().refine((v) => v === true, { message: `${label} must be checked` })
      : z.boolean();
  }

  if (type === "multiselect") {
    const base = z.array(z.string());
    if (!required) return base;
    return base.refine((v) => v.length > 0, { message: `${label} is required` });
  }

  if (type === "number" || type === "currency" || type === "rating") {
    return required
      ? z.string().trim().min(1, `${label} is required`).refine(
          (v) => NUMERIC_RE.test(v),
          { message: `${label} must be a number` },
        )
      : z.string().trim().refine(
          (v) => v === "" || NUMERIC_RE.test(v),
          { message: `${label} must be a number` },
        );
  }

  if (type === "url") {
    return required
      ? z.string().trim().min(1, `${label} is required`).refine(
          isHttpsUrl,
          { message: `${label} must be an http(s) URL` },
        )
      : z.string().trim().refine(
          (v) => v === "" || isHttpsUrl(v),
          { message: `${label} must be an http(s) URL` },
        );
  }

  if (type === "date") {
    return required
      ? z.string().trim().min(1, `${label} is required`).refine(
          (v) => ISO_DATE_RE.test(v),
          { message: `${label} must be a date (YYYY-MM-DD)` },
        )
      : z.string().trim().refine(
          (v) => v === "" || ISO_DATE_RE.test(v),
          { message: `${label} must be a date (YYYY-MM-DD)` },
        );
  }

  if (type === "dropdown") {
    if (options && options.length > 0) {
      const allowed = options;
      return required
        ? z.string().trim().min(1, `${label} is required`).refine(
            (v) => allowed.includes(v),
            { message: `${label} must be one of the allowed options` },
          )
        : z.string().trim().refine(
            (v) => v === "" || allowed.includes(v),
            { message: `${label} must be one of the allowed options` },
          );
    }
    return required ? z.string().trim().min(1, `${label} is required`) : z.string();
  }

  if (type === "email") {
    return required
      ? z.string().trim().min(1, `${label} is required`).email(`${label} must be a valid email`)
      : z.string().trim().refine(
          (v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
          { message: `${label} must be a valid email` },
        );
  }

  return required
    ? z.string().trim().min(1, `${label} is required`)
    : z.string();
}

export function buildDynamicSchema(
  fields: FormField[],
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    shape[field.key] = buildFieldSchema(field);
  }
  return z.object(shape);
}
