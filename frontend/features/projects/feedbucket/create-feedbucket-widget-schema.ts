import { z } from "zod";

export const createFeedbucketWidgetSchema = z.object({
  name: z.string().min(1, "Widget name is required"),
  aiAssistEnabled: z.boolean(),
});

export type CreateFeedbucketWidgetFormValues = z.infer<typeof createFeedbucketWidgetSchema>;
