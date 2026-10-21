import * as z from "zod";

export const invitationAcceptSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "Enter your first name")
    .max(100, "First name must be 100 characters or fewer"),
  lastName: z
    .string()
    .trim()
    .min(1, "Enter your last name")
    .max(100, "Last name must be 100 characters or fewer"),
});

export type InvitationAcceptFormValues = z.infer<typeof invitationAcceptSchema>;

export const invitationOtpSchema = z.object({
  emailOtp: z
    .string()
    .length(6, "Verification code must be 6 digits")
    .regex(/^\d{6}$/, "Verification code must be 6 digits"),
});

export type InvitationOtpFormValues = z.infer<typeof invitationOtpSchema>;

export function canonicalEmail(value: string): string {
  return value.trim().toLowerCase();
}
