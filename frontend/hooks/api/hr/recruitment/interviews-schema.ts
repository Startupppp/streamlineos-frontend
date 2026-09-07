import { z } from "zod";

export const interviewStatsSchema = z.object({
  total: z.number().int(),
  pending: z.number().int(),
  passed: z.number().int(),
  failed: z.number().int(),
});

export const interviewSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  candidateId: z.number().int(),
  jobPostingId: z.number().int().nullable(),
  interviewerId: z.string().nullable(),
  interviewerMembershipId: z.number().int().nullable(),
  type: z.enum(["PHONE", "VIDEO", "ONSITE", "TECHNICAL", "HR", "FINAL"]).nullable(),
  scheduledAt: z.string(),
  duration: z.number().int(),
  location: z.string().nullable(),
  meetingLink: z.string().nullable(),
  result: z.enum(["PENDING", "PASSED", "FAILED", "NO_SHOW"]).nullable(),
  feedback: z.string().nullable(),
  rating: z.number().int().nullable(),
  rubric: z
    .array(
      z.object({
        category: z.string(),
        score: z.number(),
        maxScore: z.number(),
        comment: z.string().optional(),
      }),
    )
    .nullable(),
  notes: z.string().nullable(),
  recordingUrl: z.string().nullable(),
  recordingPlatform: z.string().nullable(),
  remindersSent: z.record(z.string(), z.boolean()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const interviewListResponseSchema = z.object({
  items: z.array(interviewSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalPages: z.number().int(),
});

export const interviewSuccessSchema = z.object({ success: z.literal(true) });

export const scorecardTemplateSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  criteria: z.array(z.object({ name: z.string(), weight: z.number() })),
  isActive: z.boolean(),
  createdBy: z.string(),
  createdByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const scorecardTemplateListSchema = z.array(scorecardTemplateSchema);

export const interviewScorecardSchema = z.object({
  id: z.number().int(),
  orgId: z.string().nullable(),
  interviewId: z.number().int(),
  interviewerId: z.string(),
  interviewerMembershipId: z.number().int().nullable(),
  templateId: z.number().int().nullable(),
  ratings: z.record(z.string(), z.number()),
  recommendation: z.enum(["HIRE", "NO_HIRE", "MAYBE"]),
  notes: z.string().nullable(),
  isBlindMode: z.boolean(),
  submittedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const scheduleInterviewWithPanelSchema = interviewSchema.extend({
  panelInterviewerIds: z.array(z.string()),
});

export const interviewSlaSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  stage: z.string(),
  maxHours: z.number().int(),
  warningHours: z.number().int(),
  createdAt: z.string(),
});

export const interviewSlaListSchema = z.array(interviewSlaSchema);

export const slaReportResponseSchema = z.object({
  report: z.array(
    z.object({
      month: z.string(),
      label: z.string(),
      stages: z.array(
        z.object({
          stage: z.string(),
          total: z.number().int(),
          breached: z.number().int(),
          breachPct: z.number().int(),
        }),
      ),
      overall: z.object({
        total: z.number().int(),
        breached: z.number().int(),
        breachPct: z.number().int(),
      }),
    }),
  ),
  stages: z.array(z.string()),
  stageSummary: z.array(
    z.object({
      stage: z.string(),
      avgBreachPct: z.number().int(),
      totalBreached: z.number().int(),
      totalAll: z.number().int(),
    }),
  ),
});

export const interviewQuestionRowSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  question: z.string(),
  category: z.string(),
  role: z.string().nullable(),
  difficulty: z.string(),
  tags: z.array(z.string()),
  sampleAnswer: z.string().nullable(),
  keywords: z.array(z.string()),
  isActive: z.boolean(),
  createdBy: z.string().nullable(),
  createdByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const interviewQuestionListSchema = z.array(interviewQuestionRowSchema);

export const interviewerPerformanceSchema = z.object({
  stats: z.array(
    z.object({
      interviewerId: z.string(),
      interviewerName: z.string().nullable(),
      interviewerEmail: z.string(),
      totalAssigned: z.number().int(),
      submitted: z.number().int(),
      pending: z.number().int(),
      avgHoursToSubmit: z.number().nullable(),
      recommendations: z.record(z.string(), z.number().int()),
    }),
  ),
  period: z.object({ days: z.number().int(), since: z.string() }),
});

export const bookingLinkWithRelationsSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  candidateId: z.number().int(),
  jobPostingId: z.number().int().nullable(),
  token: z.string(),
  durationMinutes: z.number().int(),
  interviewType: z.string(),
  availableSlots: z.array(z.unknown()),
  selectedSlot: z.string().nullable(),
  status: z.enum(["pending", "booked", "expired", "cancelled"]),
  expiresAt: z.string(),
  createdBy: z.string(),
  createdByMembershipId: z.number().int().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  candidate: z
    .object({ id: z.number().int(), firstName: z.string(), lastName: z.string(), email: z.string() })
    .nullable(),
  jobPosting: z.object({ id: z.number().int(), title: z.string() }).nullable(),
  creator: z.object({ id: z.string(), name: z.string().nullable() }).nullable(),
});

export const bookingLinkListSchema = z.array(bookingLinkWithRelationsSchema);

export const bookingCancelResponseSchema = z.object({ success: z.literal(true) });

export const availabilityResponseSchema = z.object({
  date: z.string(),
  availability: z.array(
    z.object({
      interviewerId: z.string(),
      busyBlocks: z.array(
        z.object({
          start: z.string(),
          end: z.string(),
          title: z.string(),
        }),
      ),
    }),
  ),
});
