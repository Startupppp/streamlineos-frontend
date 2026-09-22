import { z } from "zod";

export const createPmWorkspaceFormSchema = z.object({
  name: z.string().min(1, "Required").max(120),
  slug: z
    .string()
    .min(1, "Required")
    .max(60)
    .regex(
      /^[a-z][a-z0-9-]*$/,
      "Lowercase letters, digits or hyphens; must start with a letter",
    ),
});

export const editPmWorkspaceFormSchema = z.object({
  name: z.string().min(1, "Required").max(120),
  status: z.enum(["active", "archived"]),
});

export type CreatePmWorkspaceFormInput = z.infer<typeof createPmWorkspaceFormSchema>;
export type EditPmWorkspaceFormInput = z.infer<typeof editPmWorkspaceFormSchema>;
