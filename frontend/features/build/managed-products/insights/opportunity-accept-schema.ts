import { z } from "zod";

export const acceptSchema = z.object({
  horizon: z.enum(["now", "next", "later"]),
  title: z.string().trim().min(1).max(500).optional(),
  projectId: z.number().int().positive().optional(),
  goalId: z.number().int().positive().optional(),
  releaseId: z.number().int().positive().optional(),
  epicTicketId: z.number().int().positive().optional(),
  isPublic: z.boolean().optional(),
  dependsOnIds: z.array(z.number().int().positive()).max(20).optional(),
  note: z.string().trim().max(2000).optional(),
  expectedVersion: z.number().int().min(1),
});

export type AcceptFormValues = z.infer<typeof acceptSchema>;
