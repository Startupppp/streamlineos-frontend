import { z } from "zod";

export const createFeedbucketWidgetSchema = z.object({
  name: z.string().min(1, "Widget name is required"),
  aiAssistEnabled: z.boolean(),
  autoCreateTicket: z.boolean().optional(),
  defaultAssigneeId: z.string().optional(),
});

export type CreateFeedbucketWidgetFormValues = z.infer<typeof createFeedbucketWidgetSchema>;
