import { z } from "zod";

export const inviteClientFormSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(255),
  lastName: z.string().max(255).optional(),
  email: z
    .string()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
});

export type InviteClientFormValues = z.infer<typeof inviteClientFormSchema>;
