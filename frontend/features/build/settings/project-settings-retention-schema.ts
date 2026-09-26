import { z } from "zod";

export const RETENTION_SECTION_VALUES = ["policy", "holds"] as const;
export type RetentionSection = (typeof RETENTION_SECTION_VALUES)[number];

function isRetentionSection(v: string): v is RetentionSection {
  return (RETENTION_SECTION_VALUES as readonly string[]).includes(v);
}

export function parseRetentionSection(raw: string | null): RetentionSection {
  if (raw !== null && isRetentionSection(raw)) return raw;
  return "policy";
}

export const RETENTION_DAYS_OPTIONS = [
  { label: "30 days", value: 30 },
  { label: "60 days", value: 60 },
  { label: "90 days", value: 90 },
  { label: "180 days", value: 180 },
  { label: "1 year (365 days)", value: 365 },
] as const;

export type RetentionDaysOptionValue =
  (typeof RETENTION_DAYS_OPTIONS)[number]["value"];

const RETENTION_DAYS_VALUES = RETENTION_DAYS_OPTIONS.map(
  (o) => o.value,
) as number[];

function isRetentionDaysOptionValue(v: number): v is RetentionDaysOptionValue {
  return RETENTION_DAYS_VALUES.includes(v);
}

export const retentionDaysOptionSchema = z
  .number()
  .int()
  .positive()
  .refine(isRetentionDaysOptionValue, {
    message: "Must be one of 30, 60, 90, 180, or 365",
  })
  .nullable();

export const projectRetentionSettingsContract = z.object({
  projectId: z.number().int(),
  inheritOrgPolicy: z.boolean(),
  closedTicketRetentionDays: retentionDaysOptionSchema,
  attachmentRetentionDays: retentionDaysOptionSchema,
  auditLogRetentionDays: retentionDaysOptionSchema,
  legalHold: z.boolean(),
  legalHoldReason: z.string().nullable(),
  legalHoldSetAt: z.string().nullable(),
  version: z.number().int(),
  updatedAt: z.string(),
});

export const updateRetentionPolicySchema = z
  .object({
    inheritOrgPolicy: z.boolean(),
    closedTicketRetentionDays: retentionDaysOptionSchema,
    attachmentRetentionDays: retentionDaysOptionSchema,
    auditLogRetentionDays: retentionDaysOptionSchema,
  })
  .strict();

export const setLegalHoldSchema = z
  .object({
    active: z.boolean(),
    reason: z.string().min(1).optional(),
  })
  .strict();

export type ProjectRetentionSettings = z.infer<
  typeof projectRetentionSettingsContract
>;
export type UpdateRetentionPolicyInput = z.infer<
  typeof updateRetentionPolicySchema
>;
export type SetLegalHoldInput = z.infer<typeof setLegalHoldSchema>;
