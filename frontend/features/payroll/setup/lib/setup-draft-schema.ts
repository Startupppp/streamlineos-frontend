import { z } from "zod";
import { PAY_FREQUENCIES, TOGGLE_KEYS } from "@/types/payroll/setup";

const toggleMapSchema = z.partialRecord(z.enum(TOGGLE_KEYS), z.boolean());

export const setupProfileSchema = z.object({
  country: z.string(),
  state: z.string().optional(),
  legalEntityName: z.string().optional(),
  currency: z.string(),
  payFrequency: z.enum(PAY_FREQUENCIES),
  payDay: z.number(),
  startMonth: z.string(),
  employeeCount: z.number().optional(),
});

export const setupDraftSchema = z.object({
  policyId: z.number().optional(),
  profile: setupProfileSchema.optional(),
  templateKey: z.string().nullable().optional(),
  templateId: z.number().optional(),
  templateDefaultToggles: toggleMapSchema.optional(),
  toggleOverrides: toggleMapSchema.optional(),
});

export type SetupDraft = z.infer<typeof setupDraftSchema>;

export function parseSetupDraft(value: unknown): SetupDraft {
  const parsed = setupDraftSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}
