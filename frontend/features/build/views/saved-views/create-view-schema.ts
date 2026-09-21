import { z } from "zod";

export const LAYOUT_TYPES = ["board", "list", "table", "calendar", "gantt"] as const;

export const createViewSchema = z.object({
  name: z.string().min(1, "Name is required"),
  layoutType: z.enum(LAYOUT_TYPES).optional(),
  visibility: z.enum(["shared", "private"]).optional(),
});

export type CreateViewForm = z.infer<typeof createViewSchema>;
