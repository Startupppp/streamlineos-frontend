import { z } from "zod";
import {
  ORG_MODULE_KEYS,
  inviteeModuleAccessSchema,
} from "@/hooks/api/org-setup-schema";
export {
  ORG_MODULE_KEYS,
  MAX_INVITEE_MODULE_ACCESS,
  inviteeModuleAccessSchema,
} from "@/hooks/api/org-setup-schema";
export type {
  InviteeModuleAccess,
  OrgModuleKey,
} from "@/hooks/api/org-setup-schema";

const optionalString = z.string().optional().catch(undefined);

export const inviteeSchema = z.object({
  email: z.string(),
  role: z.string(),
  department: z.string().optional(),
  moduleAccess: inviteeModuleAccessSchema.optional(),
});

export const wizardDataSchema = z.object({
  goals: z.array(z.string()).catch([]),
  industry: z.string().catch(""),
  companyName: z.string().catch(""),
  displayName: z.string().catch(""),
  fullName: z.string().catch(""),
  teamSize: z.string().catch(""),
  country: optionalString,
  region: optionalString,
  timezone: optionalString,
  phone: z.string().catch(""),
  currency: optionalString,
  fiscalYearStart: optionalString,
  businessAddress: optionalString,
  taxId: optionalString,
  installedApps: z.array(z.string()).catch([]),
  modules: z.array(z.enum(ORG_MODULE_KEYS)).catch([]),
  invitees: z.array(inviteeSchema).catch([]),
  moduleAnswers: z.record(z.string(), z.record(z.string(), z.unknown())).catch({}),
});

export type Invitee = z.infer<typeof inviteeSchema>;
export type WizardData = z.infer<typeof wizardDataSchema>;

export function parseWizardDraft(value: unknown): WizardData {
  const parsed = wizardDataSchema.safeParse(value);
  return parsed.success ? parsed.data : wizardDataSchema.parse({});
}
