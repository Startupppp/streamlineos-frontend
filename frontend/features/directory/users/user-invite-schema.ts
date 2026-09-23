import { z } from "zod";
import { inviteEmailSchema } from "@/lib/validation/user-invite";
import { USER_INVITE_ROLE_VALUES } from "@/lib/constants/user-invite-roles";

export const inviteUserSchema = z.object({
  email: inviteEmailSchema,
  role: z.enum(USER_INVITE_ROLE_VALUES),
});

export type InviteUserFormValues = z.infer<typeof inviteUserSchema>;
