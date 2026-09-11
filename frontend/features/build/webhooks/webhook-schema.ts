import { z } from "zod";

export const webhookSchema = z.object({
  url: z.string().url("Must be a valid URL starting with https://"),
  events: z.array(z.string()).min(1, "Select at least one event"),
  secret: z.string().optional(),
});

export type WebhookFormValues = z.infer<typeof webhookSchema>;
