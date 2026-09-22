import { z } from "zod";

export const EPIC_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const EPIC_STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const;

const MEANINGFUL_TEXT_RE = /[a-zA-Z0-9À-ɏЀ-ӿ一-鿿]/;

export const createEpicSchema = z.object({
  title: z
    .string()
    .min(1, "Epic title is required")
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(120, "Title must be 120 characters or fewer")
    .refine((v) => MEANINGFUL_TEXT_RE.test(v), "Title must contain at least one letter or number"),
  description: z.string().max(2000, "Description must be 2,000 characters or fewer").optional(),
  priority: z.enum(EPIC_PRIORITIES),
});

export type CreateEpicInput = z.infer<typeof createEpicSchema>;

export const editEpicSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(120, "Title must be 120 characters or fewer")
    .refine((v) => MEANINGFUL_TEXT_RE.test(v), "Title must contain at least one letter or number"),
  description: z.string().max(2000, "Description must be 2,000 characters or fewer").optional(),
  priority: z.enum(EPIC_PRIORITIES),
  status: z.enum(EPIC_STATUSES),
});

export type EditEpicInput = z.infer<typeof editEpicSchema>;
