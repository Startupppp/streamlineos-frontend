import { z } from "zod";

const optionalString = z.string().optional().catch(undefined);

export const inviteeSchema = z.object({
  email: z.string(),
  role: z.string(),
  department: z.string().optional(),
});

export const wizardDataSchema = z.object({
  goals: z.array(z.string()).catch([]),
  industry: z.string().catch(""),
  companyName: z.string().catch(""),
  teamSize: z.string().catch(""),
  country: optionalString,
  timezone: optionalString,
  phone: z.string().catch(""),
  currency: optionalString,
  fiscalYearStart: optionalString,
  businessAddress: optionalString,
  taxId: optionalString,
  installedApps: z.array(z.string()).catch([]),
  modules: z.array(z.string()).catch([]),
  invitees: z.array(inviteeSchema).catch([]),
});

export type Invitee = z.infer<typeof inviteeSchema>;
export type WizardData = z.infer<typeof wizardDataSchema>;

export function parseWizardDraft(value: unknown): WizardData {
  const parsed = wizardDataSchema.safeParse(value);
  return parsed.success ? parsed.data : wizardDataSchema.parse({});
}
