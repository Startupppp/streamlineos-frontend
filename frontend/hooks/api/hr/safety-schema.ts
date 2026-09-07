import { z } from "zod";

const safetyIncidentSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  incidentNumber: z.string(),
  type: z.string(),
  location: z.string(),
  occurredAt: z.string(),
  reportedBy: z.string(),
  description: z.string(),
  severity: z.string(),
  status: z.string(),
  medicalAttention: z.boolean(),
  confidentialMedicalNote: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

const safetyIncidentPaginationSchema = z.object({
  limit: z.number().int(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

export const safetyIncidentListContract = z.object({
  data: z.array(safetyIncidentSchema),
  pagination: safetyIncidentPaginationSchema,
});

export const safetyIncidentContract = safetyIncidentSchema;

export const wellnessCheckinContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  userId: z.string(),
  userMembershipId: z.number().int().nullable(),
  date: z.string(),
  score: z.number().int(),
  flags: z.array(z.string()).nullable(),
  createdAt: z.string(),
});

export const wellnessCheckinListContract = z.array(wellnessCheckinContract);

export const wellnessTrendListContract = z.array(
  z.object({
    date: z.string(),
    avgScore: z.number().nullable(),
    respondents: z.number().int().nullable(),
  }),
);

export const burnoutFlagListContract = z.array(
  z.object({
    userId: z.string(),
    avgScore: z.number(),
    checkCount: z.number().int(),
  }),
);

export const wellnessPulseContract = z.object({
  mode: z.literal("k_anonymized_pulse"),
  honestyNote: z.string(),
  windowDays: z.number().int(),
  minGroupSize: z.number().int(),
  suppressed: z.boolean(),
  respondents: z.number().int().nullable(),
  avgScore: z.number().nullable(),
  checkins: z.number().int().nullable(),
  burnoutThreshold: z.number().int(),
});

export type SafetyIncidentListResponse = z.infer<typeof safetyIncidentListContract>;
export type WellnessCheckinResponse = z.infer<typeof wellnessCheckinContract>;
export type WellnessPulseResponse = z.infer<typeof wellnessPulseContract>;
