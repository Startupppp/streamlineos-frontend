import { z } from "zod";

export interface FormField {
  key: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
}

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
