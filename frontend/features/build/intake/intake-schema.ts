import { z } from "zod";
import { intakeUpdateIntakeBodySchema } from "@/contracts/build-contracts.generated";

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

export const declineIntakeSchema = z.object({
  reason: z.string().min(1, "Reason is required"),
});

export const intakeDecisionSchema = z.discriminatedUnion("action", [
  acceptSchema.extend({ action: z.literal("accept") }),
  declineIntakeSchema.extend({ action: z.literal("decline") }),
  z.object({
    action: z.literal("duplicate"),
    linkedWorkItemId: intakeUpdateIntakeBodySchema.shape.linkedWorkItemId.unwrap(),
  }),
]);

export type IntakeDecisionForm = z.infer<typeof intakeDecisionSchema>;
