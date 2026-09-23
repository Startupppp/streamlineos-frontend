import { z } from "zod";

export const ONBOARDING_STEP_OWNER_ROLES = ["NEW_HIRE", "HR", "MANAGER", "IT"] as const;

const onboardingPlanStepSchema = z.object({
  title: z.string().trim().min(1, "Step title is required"),
  ownerRole: z.enum(ONBOARDING_STEP_OWNER_ROLES),
  dueOffsetDays: z.number().int("Due day must be a whole number").min(0, "Due day cannot be negative"),
  isRequired: z.boolean(),
  isComplianceItem: z.boolean(),
});

export const onboardingPlanSchema = z.object({
  name: z.string().trim().min(1, "Plan name is required"),
  departmentId: z.string(),
  description: z.string().trim(),
  steps: z.array(onboardingPlanStepSchema).min(1, "Add at least one step"),
});

export type OnboardingPlanFormValues = z.infer<typeof onboardingPlanSchema>;
export type OnboardingPlanStepValues = z.infer<typeof onboardingPlanStepSchema>;

export function emptyOnboardingPlanStep(): OnboardingPlanStepValues {
  return { title: "", ownerRole: "NEW_HIRE", dueOffsetDays: 0, isRequired: true, isComplianceItem: false };
}

export const ONBOARDING_PLAN_DEFAULTS: OnboardingPlanFormValues = {
  name: "",
  departmentId: "",
  description: "",
  steps: [emptyOnboardingPlanStep()],
};
