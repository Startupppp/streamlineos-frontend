import { z } from "zod";

export const LAYOUT_TYPES = ["board", "list", "table", "calendar", "gantt"] as const;

export const MAX_VIEW_NAME = 100;

export const createViewSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(MAX_VIEW_NAME, `Name must be ${MAX_VIEW_NAME} characters or fewer`),
  layoutType: z.enum(LAYOUT_TYPES).optional(),
  visibility: z.enum(["shared", "private"]).optional(),
});

export type CreateViewForm = z.infer<typeof createViewSchema>;
