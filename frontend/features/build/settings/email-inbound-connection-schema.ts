import { z } from "zod";

export const emailInboundConnectionSchema = z.object({
  provider: z.enum(["postmark", "mailgun", "sendgrid"]),
  inboundAddress: z.string().email("Must be a valid email address"),
  signingSecret: z.string().min(1, "Signing secret is required"),
});

export type EmailInboundConnectionFormValues = z.infer<typeof emailInboundConnectionSchema>;
