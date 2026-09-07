import { z } from "zod";

export const candidateSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  resumeUrl: z.string().nullable(),
  resumeText: z.string().nullable(),
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
  sourceUrl: z.string().nullable(),
  location: z.string().nullable(),
  gender: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const candidateListResponseSchema = z.object({
  items: z.array(candidateSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalPages: z.number().int(),
  statusCounts: z.record(z.string(), z.number()),
});

export const candidateDuplicateGroupSchema = z.object({
  key: z.string(),
  candidates: z.array(candidateSchema),
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
        jobPosting: z.object({
          id: z.number().int(),
          orgId: z.string(),
          title: z.string(),
          orgDepartmentId: z.string().nullable(),
          hiringFlowId: z.number().int().nullable(),
          location: z.string().nullable(),
          type: z.string(),
          experience: z.string().nullable(),
          salaryMin: z.string().nullable(),
          salaryMax: z.string().nullable(),
          description: z.string().nullable(),
          requirements: z.string().nullable(),
          benefits: z.string().nullable(),
          openings: z.number().int(),
          applicationDeadline: z.string().nullable(),
          closingDate: z.string().nullable(),
          postedBy: z.string().nullable(),
          postedByMembershipId: z.number().int().nullable(),
          externalPostingIds: z.record(z.string(), z.string()).nullable(),
          isInternal: z.boolean(),
          screeningQuestions: z
            .array(
              z.object({
                question: z.string(),
                type: z.string(),
                required: z.boolean(),
                knockout: z.boolean(),
              }),
            )
            .nullable(),
          status: z.string(),
          createdAt: z.string(),
          updatedAt: z.string(),
        }).nullable(),
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
              recommendation: z.string(),
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
