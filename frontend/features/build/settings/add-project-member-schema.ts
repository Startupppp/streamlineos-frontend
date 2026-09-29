import { z } from "zod";

export const addProjectMemberSchema = z.object({
  userId: z.string().min(1, "Select a member"),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
});

export type AddProjectMemberFormValues = z.infer<typeof addProjectMemberSchema>;
