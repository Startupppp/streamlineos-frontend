import { z } from "zod";

export const acceptSchema = z.object({
  horizon: z.enum(["now", "next", "later"]),
  title: z.string().optional(),
  projectId: z.number().int().positive().optional(),
  goalId: z.number().int().positive().optional(),
  releaseId: z.number().int().positive().optional(),
  epicTicketId: z.number().int().positive().optional(),
  isPublic: z.boolean().optional(),
  dependsOnIds: z.array(z.number().int().positive()).optional(),
  note: z.string().optional(),
  expectedVersion: z.number().int(),
});

export type AcceptFormValues = z.infer<typeof acceptSchema>;
