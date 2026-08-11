import { z } from "zod";

export const sequenceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  entityType: z.enum(["lead", "deal", "contact"]),
  isActive: z.boolean(),
});

export type SequenceFormValues = z.infer<typeof sequenceSchema>;
