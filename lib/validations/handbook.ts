import { z } from "zod";

const trimmed = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

export const handbookVersionSchema = z.object({
  version: trimmed(1, 32, "Version").regex(
    /^[\w.\-]+$/,
    "Version may only contain letters, numbers, dots, and hyphens",
  ),
  title: trimmed(1, 120, "Title"),
  description: z
    .string()
    .trim()
    .max(2000, "Description must be at most 2000 characters")
    .optional()
    .or(z.literal("")),
  documentUrl: z
    .string()
    .trim()
    .max(2048, "Document URL is too long")
    .url("Enter a valid URL (https://...)")
    .optional()
    .or(z.literal("")),
});

export const handbookUpdateSchema = handbookVersionSchema.partial().extend({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

export type HandbookVersionInput = z.infer<typeof handbookVersionSchema>;
export type HandbookUpdateInput = z.infer<typeof handbookUpdateSchema>;
