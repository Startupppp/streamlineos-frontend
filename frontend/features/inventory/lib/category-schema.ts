import { z } from "zod";

export const CATEGORY_NAME_MIN = 2;
export const CATEGORY_NAME_MAX = 100;
export const CATEGORY_DESC_MAX = 500;
export const VALID_NAME_RE = /[a-zA-Z0-9]/;

export const categorySchema = z.object({
  name: z
    .string()
    .min(1, "Category name is required.")
    .max(
      CATEGORY_NAME_MAX,
      `Name must be ${CATEGORY_NAME_MAX} characters or fewer.`,
    )
    .refine(
      (v) => v.trim().length >= CATEGORY_NAME_MIN,
      `Name must be at least ${CATEGORY_NAME_MIN} characters.`,
    )
    .refine(
      (v) => VALID_NAME_RE.test(v.trim()),
      "Name must contain at least one letter or number.",
    ),
  description: z
    .string()
    .max(
      CATEGORY_DESC_MAX,
      `Description must be ${CATEGORY_DESC_MAX} characters or fewer.`,
    )
    .optional(),
  parentId: z.string().optional(),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
