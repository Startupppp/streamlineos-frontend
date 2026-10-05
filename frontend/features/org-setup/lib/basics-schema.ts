import { z } from "zod";

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
  teamSize: z.string().optional(),
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
    .max(
      INDUSTRY_MAX_LENGTH,
      `Industry must be ${INDUSTRY_MAX_LENGTH} characters or fewer.`,
    )
    .optional(),
  phone: z.string().optional(),
  goals: z.array(z.string()).optional(),
});

export type WorkspaceStepValues = z.infer<typeof workspaceStepSchema>;

export const WORKSPACE_VISIBLE_FIELDS = [
  "displayName",
  "teamSize",
  "timezone",
  "region",
] as const;
