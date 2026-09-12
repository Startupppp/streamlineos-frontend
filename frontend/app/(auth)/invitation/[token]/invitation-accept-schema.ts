import * as z from "zod";

export const invitationAcceptSchema = z.object({
  firstName: z
    .string()
    .max(100, "First name must be 100 characters or fewer")
    .optional(),
  lastName: z
    .string()
    .max(100, "Last name must be 100 characters or fewer")
    .optional(),
});

export type InvitationAcceptFormValues = z.infer<typeof invitationAcceptSchema>;
