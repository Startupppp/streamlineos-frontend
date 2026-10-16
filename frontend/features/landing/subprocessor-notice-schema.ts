import { z } from "zod";

export const subprocessorNoticeSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(254),
});

export type SubprocessorNoticeValues = z.output<typeof subprocessorNoticeSchema>;
