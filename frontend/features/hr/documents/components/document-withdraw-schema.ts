import { z } from "zod";

export const WITHDRAW_REASON_MAX_LENGTH = 500;

export const documentWithdrawSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "Say why it is being taken out, so the audit log can show it.")
    .max(WITHDRAW_REASON_MAX_LENGTH, `Keep it under ${WITHDRAW_REASON_MAX_LENGTH} characters.`),
});

export type DocumentWithdrawValues = z.infer<typeof documentWithdrawSchema>;
