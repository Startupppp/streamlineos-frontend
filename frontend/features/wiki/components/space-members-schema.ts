import { z } from "zod";

export const spaceRoleEnum = z.enum([
  "viewer",
  "commenter",
  "editor",
  "publisher",
  "admin",
]);

export const addMemberSchema = z
  .object({
    userId: z.string().optional(),
    role: z.string().optional(),
    spaceRole: spaceRoleEnum,
  })
  .superRefine((val, ctx) => {
    const hasUser = (val.userId ?? "").trim().length > 0;
    const hasRole = (val.role ?? "").trim().length > 0;
    if (!hasUser && !hasRole) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide a user ID or a role slug",
        path: ["userId"],
      });
    }
    if (hasUser && hasRole) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide either a user ID or a role, not both",
        path: ["userId"],
      });
    }
  });

export type AddMemberFormValues = z.infer<typeof addMemberSchema>;
