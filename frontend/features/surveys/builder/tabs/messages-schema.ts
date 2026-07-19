import { z } from "zod";

export const messagesSchema = z.object({
  welcomeMessage: z.string().max(2000).optional(),
  submitButtonText: z.string().max(100).optional(),
  thankYouMessage: z.string().max(2000).optional(),
  disqualificationMessage: z.string().max(2000).optional(),
  closedMessage: z.string().max(2000).optional(),
});

export type MessagesValues = z.infer<typeof messagesSchema>;
