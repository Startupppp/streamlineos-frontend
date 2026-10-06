import { z } from "zod";

export const activateClientFormSchema = z
  .object({
    firstName: z.string().min(1, "First name is required").max(255),
    lastName: z.string().max(255).optional(),
    email: z.string().email("Invalid email address"),
    projectId: z.number().int().positive("Project is required"),
    canViewMilestones: z.boolean().optional(),
    canViewTasks: z.boolean().optional(),
    canViewAttachments: z.boolean().optional(),
    canViewComments: z.boolean().optional(),
    canSubmitChangeRequests: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    const anyCapability =
      value.canViewMilestones === true ||
      value.canViewTasks === true ||
      value.canViewAttachments === true ||
      value.canViewComments === true ||
      value.canSubmitChangeRequests === true;
    if (!anyCapability) {
      ctx.addIssue({
        code: "custom",
        message: "Select at least one visibility permission",
        path: ["canViewTasks"],
      });
    }
  });

export type ActivateClientFormValues = z.infer<typeof activateClientFormSchema>;

export type ActivateClientFormInput = z.input<typeof activateClientFormSchema>;
