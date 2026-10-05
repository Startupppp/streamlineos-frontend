import { z } from "zod";

export const activateClientFormSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(255),
  lastName: z.string().max(255).optional(),
  email: z.string().email("Invalid email address"),
  projectId: z.number().int().positive("Project is required"),
  canViewMilestones: z.boolean().optional(),
  canViewTasks: z.boolean().optional(),
  canViewAttachments: z.boolean().optional(),
  canViewComments: z.boolean().optional(),
  canSubmitChangeRequests: z.boolean().optional(),
});

export type ActivateClientFormValues = z.infer<typeof activateClientFormSchema>;

export type ActivateClientFormInput = ActivateClientFormValues;
