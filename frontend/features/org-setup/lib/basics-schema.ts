import { isValidPhoneNumber } from "react-phone-number-input";
import { z } from "zod";
import type { WizardData } from "./wizard-data-schema";

export const DISPLAY_NAME_MAX_LENGTH = 100;
export const COMPANY_NAME_MAX_LENGTH = 200;
export const FULL_NAME_MAX_LENGTH = 120;
export const INDUSTRY_MAX_LENGTH = 100;

export const workspaceStepSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Enter a workspace name.")
    .max(
      DISPLAY_NAME_MAX_LENGTH,
      `Workspace name must be ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.`,
    ),
  teamSize: z.string().trim().min(1, "Select a team size."),
  timezone: z.string().optional(),
  region: z.string().optional(),
  companyName: z
    .string()
    .trim()
    .max(
      COMPANY_NAME_MAX_LENGTH,
      `Company name must be ${COMPANY_NAME_MAX_LENGTH} characters or fewer.`,
    )
    .optional(),
  industry: z
    .string()
    .trim()
    .min(1, "Select an industry.")
    .max(
      INDUSTRY_MAX_LENGTH,
      `Industry must be ${INDUSTRY_MAX_LENGTH} characters or fewer.`,
    ),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => !value || isValidPhoneNumber(value),
      "Enter a valid phone number with its country code, such as +91 98765 43210.",
    )
    .optional(),
  goals: z.array(z.string()).optional(),
});

export type WorkspaceStepValues = z.infer<typeof workspaceStepSchema>;

export function parseWorkspaceStep(data: WizardData) {
  return workspaceStepSchema.safeParse({
    displayName: data.displayName,
    teamSize: data.teamSize,
    timezone: data.timezone || undefined,
    region: data.region || undefined,
    companyName: data.companyName || undefined,
    industry: data.industry,
    phone: data.phone || undefined,
    goals: data.goals.length > 0 ? data.goals : undefined,
  });
}

export const WORKSPACE_VISIBLE_FIELDS = [
  "displayName",
  "teamSize",
  "industry",
  "timezone",
  "region",
] as const;
