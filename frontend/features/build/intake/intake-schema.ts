import { z } from "zod";

export const createIntakeSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
});

export type CreateIntakeForm = z.infer<typeof createIntakeSchema>;

export const acceptSchema = z.object({
  state: z.string().min(1, "State is required"),
  assigneeId: z.string().optional(),
  cycleId: z.number().optional(),
  moduleId: z.number().optional(),
});

export type AcceptForm = z.infer<typeof acceptSchema>;

export const declineIntakeSchema = z.object({
  reason: z.string().min(1, "Reason is required"),
});

export type DeclineIntakeForm = z.infer<typeof declineIntakeSchema>;
