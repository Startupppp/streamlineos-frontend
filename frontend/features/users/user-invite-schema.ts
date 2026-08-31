import { z } from "zod";

export const inviteUserSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .max(254, "Email must be at most 254 characters")
    .transform((value) => value.toLowerCase()),
  role: z.enum(["OWNER", "ORG_ADMIN", "MEMBER"], {
    message: "Please select a role",
  }),
});

export type InviteUserFormValues = z.infer<typeof inviteUserSchema>;
