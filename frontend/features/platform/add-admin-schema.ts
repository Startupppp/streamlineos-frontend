import { z } from "zod";

export const addAdminSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export type AddAdminFormValues = z.infer<typeof addAdminSchema>;
