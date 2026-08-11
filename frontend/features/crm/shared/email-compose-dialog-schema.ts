import { z } from "zod";

export const emailSchema = z.object({
  to: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required").max(200, "Max 200 characters"),
  body: z.string().min(1, "Message is required"),
});

export type EmailFormValues = z.infer<typeof emailSchema>;
