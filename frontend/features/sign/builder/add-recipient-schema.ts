import { z } from "zod";

const SIGNER_NAME_REGEX = /^[\p{L}\p{N}][\p{L}\p{M}\p{N}\s'.,&()-]{1,79}$/u;

export const recipientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name must be at most 80 characters")
    .regex(SIGNER_NAME_REGEX, "Enter a valid name (letters, numbers, spaces and ' . , & ( ) - only)"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .refine((v) => z.string().email().safeParse(v).success, "Enter a valid email"),
  roleName: z
    .string()
    .trim()
    .min(1, "Role is required")
    .max(100, "Role must be at most 100 characters")
    .refine((v) => /[a-zA-Z0-9]/.test(v), "Role must contain at least one letter or number")
    .refine((v) => !/^[\W_]+$/.test(v), "Role cannot consist of only special characters")
    .refine((v) => !/\s{2,}/.test(v), "Role cannot have multiple consecutive spaces"),
  recipientType: z.enum(["signer", "approver", "cc", "viewer", "in_person_host", "internal_reviewer"]),
  routingOrder: z.number().int().min(1).max(50),
  authMethod: z.enum(["email_link", "access_code", "otp_email"]),
});
export type RecipientValues = z.infer<typeof recipientSchema>;
