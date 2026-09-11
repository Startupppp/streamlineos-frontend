import { z } from "zod";

/** Mirrors the backend's canonical invite-email rules so the client rejects
 * what the server would reject, rather than failing the whole batch later. */
export const inviteEmailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email address")
  .max(254, "Email must be at most 254 characters")
  .transform((value) => value.toLowerCase());

export const inviteUserSchema = z.object({
  email: inviteEmailSchema,
  role: z.enum(["MEMBER", "ORG_ADMIN"]),
});

export type InviteUserFormValues = z.infer<typeof inviteUserSchema>;
