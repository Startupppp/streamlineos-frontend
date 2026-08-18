import { z } from "zod";

export const workerEngagementFormSchema = z
  .object({
    startsOn: z.string().min(1, "Start date is required"),
    endsOn: z.string().optional(),
    workerType: z.enum([
      "FULL_TIME",
      "PART_TIME",
      "CONTRACTOR",
      "CONSULTANT",
      "INTERN",
      "TEMPORARY",
      "AGENCY",
      "FREELANCER",
    ]),
    isPrimary: z.boolean(),
    designation: z.string().max(200).optional(),
  })
  .superRefine((values, refinementContext) => {
    if (values.endsOn && values.startsOn && values.endsOn <= values.startsOn) {
      refinementContext.addIssue({
        code: "custom",
        path: ["endsOn"],
        message: "End date must be after the start date",
      });
    }
  });

export type WorkerEngagementFormValues = z.infer<
  typeof workerEngagementFormSchema
>;

export const EMPTY_WORKER_ENGAGEMENT_FORM_VALUES: WorkerEngagementFormValues = {
  startsOn: "",
  endsOn: "",
  workerType: "FULL_TIME",
  isPrimary: false,
  designation: "",
};
