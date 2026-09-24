import { z } from "zod";
import { cursorPaginationContract } from "@/hooks/api/cursor-page-schema";
import { jobPostingRowContract } from "@/hooks/api/hr/recruitment/jobs-schema";
import { REJECTION_REASONS } from "@/hooks/api/hr/recruitment/rejection-reasons-schema";

export const candidateSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  resumeUrl: z.string().nullable(),
  linkedinUrl: z.string().nullable(),
  portfolioUrl: z.string().nullable(),
  currentCompany: z.string().nullable(),
  currentRole: z.string().nullable(),
  experienceYears: z.string().nullable(),
  skills: z.array(z.string()).nullable(),
  source: z.string().nullable(),
  status: z.enum(["NEW", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"]).nullable(),
  notes: z.string().nullable(),
  rating: z.number().int().nullable(),
  referredBy: z.string().nullable(),
  externalId: z.string().nullable(),
  duplicateOfId: z.number().int().nullable(),
  aiScore: z.number().int().nullable(),
  aiScoreBreakdown: z.record(z.string(), z.number()).nullable(),
  aiScoreGeneratedAt: z.string().nullable(),
  bgvStatus: z.enum(["NOT_INITIATED", "INITIATED", "PENDING", "CLEARED", "FAILED"]).nullable(),
  bgvAgency: z.string().nullable(),
  bgvNotes: z.string().nullable(),
  bgvInitiatedAt: z.string().nullable(),
  bgvCompletedAt: z.string().nullable(),
  /**
   * Why this candidate was rejected. Optional as well as nullable because the
   * columns arrive with backend migration 1185: a frontend pointed at a
   * database that has not applied it would otherwise fail this contract and
   * render the whole candidate list as an error, which looks nothing like the
   * schema drift it actually is.
   */
  rejectionReason: z.enum(REJECTION_REASONS).nullable().optional(),
  rejectionNote: z.string().nullable().optional(),
  sourceUrl: z.string().nullable(),
  location: z.string().nullable(),
  gender: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const candidateListResponseSchema = z.object({
  data: z.array(candidateSchema),
  pagination: cursorPaginationContract,
  statusCounts: z.record(z.string(), z.number()),
});

/**
 * Duplicate detection projects eight columns, not the whole candidate row
 * (`recruitment-candidates.service.ts` `findDuplicates`), so this deliberately
 * does not reuse `candidateSchema`.
 */
export const candidateDuplicateGroupSchema = z.object({
  key: z.string(),
  candidates: z.array(
    z.object({
      id: z.number().int(),
      firstName: z.string(),
      lastName: z.string(),
      email: z.string(),
      phone: z.string().nullable(),
      status: z.enum(["NEW", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"]),
      createdAt: z.string(),
      duplicateOfId: z.number().int().nullable(),
    }),
  ),
});

export const candidateDuplicateGroupListSchema = z.array(candidateDuplicateGroupSchema);

export const candidateSuccessSchema = z.object({ success: z.literal(true) });

export const candidateBulkShortlistResponseSchema = z.object({
  shortlisted: z.number().int(),
  skipped: z.number().int(),
});

const jobApplicationSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  candidateId: z.number().int(),
  jobPostingId: z.number().int(),
  appliedAt: z.string(),
  coverLetter: z.string().nullable(),
  notes: z.string().nullable(),
  screeningAnswers: z.record(z.string(), z.string()).nullable(),
  status: z.enum(["APPLIED", "SHORTLISTED", "INTERVIEWING", "OFFERED", "ACCEPTED", "REJECTED", "WITHDRAWN"]).nullable(),
  /**
   * What the candidate consented to, and when that consent expires.
   *
   * `consentPurpose` is a plain string rather than an enum on purpose: the
   * closed list lives in the backend and is enforced by a CHECK there, and a
   * second enum here would reject a purpose the backend legitimately added and
   * blank the whole application row. Unrecognised values are labelled as
   * unrecognised instead, which is the honest rendering.
   *
   * All four are null on every application created before backend migration
   * 1187. That is left visible rather than defaulted — an unknown retention
   * period must not render as though somebody agreed to one.
   */
  consentAt: z.string().nullable().optional(),
  consentPurpose: z.string().nullable().optional(),
  consentVersion: z.string().nullable().optional(),
  retainUntil: z.string().nullable().optional(),
  updatedAt: z.string(),
});

const candidateSlaTrackingSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  candidateId: z.number().int(),
  stage: z.string(),
  enteredAt: z.string(),
  breachedAt: z.string().nullable(),
  status: z.string(),
  updatedAt: z.string(),
});

export const candidateDetailSchema = candidateSchema.extend({
  applications: z
    .array(
      jobApplicationSchema.extend({
        jobPosting: jobPostingRowContract.nullable(),
      }),
    )
    .optional(),
  interviews: z
    .array(
      z.object({
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
        scorecards: z
          .array(
            z.object({
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
            }),
          )
          .optional(),
        interviewer: z
          .object({
            id: z.string(),
            firstName: z.string().nullable(),
            lastName: z.string().nullable(),
            email: z.string().nullable(),
            image: z.string().nullable(),
          })
          .nullable()
          .optional(),
      }),
    )
    .optional(),
  slaTracking: z.array(candidateSlaTrackingSchema),
});

export const aiScoreResultSchema = z.object({
  overall: z.number(),
  breakdown: z.object({
    technicalSkills: z.number(),
    experience: z.number(),
    communication: z.number(),
    cultureFit: z.number(),
    leadership: z.number(),
  }),
  summary: z.string(),
});

export const compositeScoreResultSchema = z.object({
  verdict: z.enum(["STRONG_HIRE", "HIRE", "ON_FENCE", "NO_HIRE"]),
  overall: z.number(),
  reasoning: z.string(),
  strengthsAcrossRounds: z.array(z.string()),
  concernsAcrossRounds: z.array(z.string()),
  roundSummaries: z.array(
    z.object({
      interviewType: z.string(),
      scheduledAt: z.string(),
      recommendation: z.string(),
      overallRating: z.number().nullable(),
      keyNotes: z.string(),
    }),
  ),
});

export const pipelineStageSchema = z.object({
  stage: z.enum(["NEW", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"]),
  total: z.number().int(),
  /**
   * How many of `total` this response actually carries, and whether the column
   * is cut. The endpoint caps each stage, so a board that printed `total` over
   * a short list was claiming to show candidates it had never sent.
   */
  shown: z.number().int(),
  truncated: z.boolean(),
  candidates: z.array(
    z.object({
      id: z.number().int(),
      name: z.string(),
      email: z.string(),
      phone: z.string().nullable(),
      source: z.string().nullable(),
      rating: z.number().int().nullable(),
      jobTitle: z.string().nullable(),
      applicationId: z.number().int().nullable(),
      appliedAt: z.string().nullable(),
      slaStatus: z.enum(["ON_TRACK", "AT_RISK", "BREACHED"]).nullable(),
      resumeUrl: z.string().nullable(),
      notes: z.string().nullable(),
    }),
  ),
});

export const pipelineResponseSchema = z.object({
  stages: z.array(pipelineStageSchema),
});

export const candidateMoveStageResponseSchema = z.object({
  id: z.number().int(),
  stage: z.enum(["NEW", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"]),
  changed: z.boolean(),
});

export const candidateBulkRejectResponseSchema = z.object({
  rejected: z.number().int(),
  alreadyRejected: z.number().int(),
  emailsSent: z.number().int(),
});

export const jobApplicationResponseSchema = jobApplicationSchema;

export const recruitmentAnalyticsSchema = z.object({
  funnel: z.array(
    z.object({
      stage: z.string(),
      count: z.number().int(),
      avgDaysInStage: z.number().nullable(),
    }),
  ),
  hireRate: z.number().int(),
  totalCandidates: z.number().int(),
  totalHired: z.number().int(),
});

/**
 * What came back from erasing a candidate.
 *
 * `vault` is a discriminated union, not a flag, because the two cases are
 * different claims about a real person's data: CLEARED means the object store
 * accepted every delete, NOT_CONFIRMED means at least one résumé may still
 * exist. The UI must never collapse them into one "Deleted" toast.
 */
export const candidateErasureContract = z.object({
  candidateId: z.number().int(),
  status: z.enum(["ERASED", "VAULT_NOT_CONFIRMED"]),
  recordsDeleted: z.object({
    applications: z.number().int(),
    interviews: z.number().int(),
    slaTracking: z.number().int(),
    vaultDocuments: z.number().int(),
    candidate: z.number().int(),
  }),
  vault: z.discriminatedUnion("vault", [
    z.object({
      vault: z.literal("CLEARED"),
      objectsDeleted: z.number().int(),
      reason: z.string(),
    }),
    z.object({
      vault: z.literal("NOT_CONFIRMED"),
      objectsDeleted: z.number().int(),
      objectsPendingRetry: z.number().int(),
      objectsLost: z.number().int(),
      reason: z.string(),
    }),
  ]),
  summary: z.string(),
});

export type CandidateErasureResult = z.infer<typeof candidateErasureContract>;
