import { z } from "zod";

const MEANINGFUL_TEXT_RE = /[a-zA-Z0-9À-ɏЀ-ӿ一-鿿]/;
const VERSION_RE = /^v?\d+(\.\d+)*(-[\w.]+)?(\+[\w.]+)?$|^\d{4}\.\d{2}(\.\d+)?$/;

export const releaseFormSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .trim()
    .min(3, "Name must be at least 3 characters")
    .max(120, "Name must be 120 characters or fewer")
    .refine((v) => MEANINGFUL_TEXT_RE.test(v), "Name must contain at least one letter or number"),
  version: z
    .string()
    .min(1, "Version is required")
    .trim()
    .max(30, "Version must be 30 characters or fewer")
    .refine((v) => v.trim().length > 0, "Version cannot be whitespace only")
    .refine((v) => MEANINGFUL_TEXT_RE.test(v) || VERSION_RE.test(v.trim()), "Enter a valid version, e.g. 1.4.0 or v2.0.0-beta"),
  description: z
    .string()
    .nullable()
    .optional()
    .refine(
      (v) => !v || v.replace(/<[^>]*>/g, "").length <= 10000,
      "Release notes must be 10,000 characters or fewer",
    ),
  status: z.enum(["draft", "released", "archived"]),
  releaseDate: z.string().nullable().optional(),
});

export type ReleaseFormValues = z.infer<typeof releaseFormSchema>;
