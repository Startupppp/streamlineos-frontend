import { z } from "zod";
import { inviteEmailSchema } from "@/lib/validation/user-invite";

export const inviteUserSchema = z.object({
  email: inviteEmailSchema,
  role: z.enum(["MEMBER", "ORG_ADMIN"]),
});

export type InviteUserFormValues = z.infer<typeof inviteUserSchema>;
