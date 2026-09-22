import { z } from "zod";

export const surveyResponseSessionRowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  surveyId: z.number(),
  versionId: z.number(),
  collectorId: z.number().nullable(),
  participantId: z.number().nullable(),
  anonymous: z.boolean(),
  startedAt: z.string(),
  submittedAt: z.string().nullable(),
  durationSeconds: z.number().nullable(),
  score: z.number().nullable(),
  passed: z.boolean().nullable(),
  segment: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  status: z.enum(["in_progress", "submitted", "invalid", "excluded", "deleted_by_policy"]),
});

export const surveyResponseListContract = z.object({
  items: z.array(surveyResponseSessionRowContract),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

const surveyAnswerContract = z.object({
  id: z.number(),
  orgId: z.string(),
  sessionId: z.number(),
  surveyId: z.number(),
  versionId: z.number(),
  questionId: z.number(),
  answerValue: z.unknown().nullable(),
  answerText: z.string().nullable(),
  choiceIds: z.array(z.number()).nullable(),
  score: z.number().nullable(),
  answeredAt: z.string(),
  question: z.object({
    id: z.number(),
    questionKey: z.string(),
    type: z.string(),
    title: z.string(),
    choices: z.array(z.object({
      id: z.number(),
      choiceKey: z.string(),
      label: z.string(),
      sortOrder: z.number(),
    })),
  }).optional(),
});

export const surveyResponseDetailContract = z.object({
  session: surveyResponseSessionRowContract,
  answers: z.array(surveyAnswerContract),
});

export const surveyOverviewContract = z.object({
  totalResponses: z.number(),
  submittedResponses: z.number(),
  completionRate: z.number(),
  averageCompletionTimeSeconds: z.number().nullable(),
  averageScore: z.number().nullable(),
  totalParticipants: z.number(),
});

export const surveyQuestionAnalyticsContract = z.array(
  z.object({
    questionId: z.number(),
    type: z.string(),
    title: z.string(),
    responseCount: z.number(),
    average: z.number().nullable(),
    choiceDistribution: z.array(
      z.object({
        choiceId: z.number(),
        label: z.string(),
        count: z.number(),
      }),
    ),
    textResponses: z.array(z.string().nullable()).optional(),
    minResponses: z.number(),
    suppressed: z.boolean(),
  }),
);
