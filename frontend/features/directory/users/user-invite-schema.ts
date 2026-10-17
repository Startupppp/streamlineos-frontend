import { z } from "zod";
import { inviteEmailSchema } from "@/lib/validation/user-invite";
import { USER_INVITE_ROLE_VALUES } from "@/lib/constants/user-invite-roles";

const moduleAccessItemSchema = z.object({
  moduleKey: z.string().min(1),
  standing: z.enum(["MEMBER", "ADMIN"]),
});

export const moduleAccessSchema = z
  .array(moduleAccessItemSchema)
  .max(10)
  .refine(
    (items) => new Set(items.map((i) => i.moduleKey)).size === items.length,
    { message: "Each module may appear at most once" },
  )
  .optional();

export const inviteUserSchema = z.object({
  email: inviteEmailSchema,
  role: z.enum(USER_INVITE_ROLE_VALUES),
  moduleAccess: moduleAccessSchema,
});

export type InviteUserFormValues = z.infer<typeof inviteUserSchema>;
