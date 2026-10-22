import { z } from "zod";

export const emailTemplateTestSchema = z.object({
  testEmail: z.string().trim().email("Enter a valid email address"),
  locale: z.string().min(2).max(35),
});

export type EmailTemplateTestValues = z.output<typeof emailTemplateTestSchema>;
