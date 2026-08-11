import { z } from "zod";

export const ENTITY_TYPE_VALUES = ["LEAD", "DEAL", "CONTACT", "", "none"] as const;
export type EntityTypeFieldValue = (typeof ENTITY_TYPE_VALUES)[number];

export const logActivitySchema = z.object({
  type: z.enum(["CALL", "EMAIL", "MEETING", "CUSTOM"] as const),
  title: z.string().min(1, "Title is required").max(255),
  notes: z.string().optional(),
  entityType: z.enum(ENTITY_TYPE_VALUES).optional(),
  entityId: z.string().optional(),
  dueDate: z.string().optional(),
});

export type LogActivityValues = z.infer<typeof logActivitySchema>;
