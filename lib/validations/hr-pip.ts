import { z } from "zod";

export const pipReasonCategorySchema = z.enum([
  "POOR_PERFORMANCE",
  "BEHAVIORAL",
  "POLICY_VIOLATION",
  "MISSED_KPIS",
]);

export const pipReviewFrequencySchema = z.enum(["WEEKLY", "BI_WEEKLY", "MONTHLY"]);

export const createPIPSchema = z.object({
  userId: z.string().min(1),
  reasonCategory: pipReasonCategorySchema,
  description: z.string().min(1).max(8000),
  areasOfConcern: z.array(z.string()).min(1),
  evidence: z.string().min(1).max(8000),
  goals: z
    .array(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        successCriteria: z.string().min(1),
        deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
    )
    .min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reviewFrequency: pipReviewFrequencySchema,
  reviewMethod: z.string().min(1),
  mentorId: z.string().optional().nullable(),
  hrRepId: z.string().min(1),
  expectedImprovement: z.string().min(1),
  consequencesIfNotMet: z.string().min(1),
  linkedAppraisalId: z.number().int().positive().optional().nullable(),
  /** Legacy text reason stored alongside structured fields */
  reason: z.string().max(2000).optional(),
});

export const acknowledgePIPSchema = z.object({
  comment: z.string().max(2000).optional(),
  acknowledged: z.literal(true),
});

export const patchPIPSchema = z.object({
  status: z.enum(["DRAFT", "ACTIVE", "EXTENDED", "COMPLETED", "TERMINATED"]).optional(),
  outcome: z.string().max(4000).optional(),
  notes: z.string().max(4000).optional(),
  endDate: z.string().optional(),
  finalOutcome: z.enum(["SUCCESS", "EXTENDED", "FAILED"]).optional(),
});

export const pipCheckInGoalProgressSchema = z.object({
  pipGoalId: z.number().int().positive(),
  progressStatus: z.enum(["ON_TRACK", "AT_RISK", "NOT_MEETING"]),
  percentComplete: z.number().int().min(0).max(100),
  workDone: z.string().min(1).max(8000),
  blockers: z.string().min(1).max(8000),
  nextSteps: z.string().min(1).max(8000),
});

export const createPIPCheckInSchema = z.object({
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkInType: pipReviewFrequencySchema,
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  overallStatus: z.enum(["ON_TRACK", "AT_RISK", "NOT_MEETING"]),
  summaryCommentsManager: z.string().min(1).max(8000),
  summaryCommentsEmployee: z.string().max(8000).optional().nullable(),
  managerRating: z.number().int().min(1).max(5).optional().nullable(),
  managerFeedback: z.string().min(1).max(8000),
  improvementSinceLast: z.enum(["IMPROVED", "NO_CHANGE", "DECLINED"]),
  employeeSelfComments: z.string().min(1).max(8000),
  supportRequired: z.string().max(2000).optional().nullable(),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]),
  escalationRequired: z.boolean().optional(),
  escalationNotes: z.string().max(4000).optional().nullable(),
  goalProgress: z.array(pipCheckInGoalProgressSchema).min(1),
});

export const patchPIPCheckInSchema = z.object({
  managerAckAt: z.boolean().optional(),
  employeeAckAt: z.boolean().optional(),
});
