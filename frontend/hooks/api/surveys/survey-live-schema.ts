import { z } from "zod";

export const surveyLiveSessionRowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  surveyId: z.number(),
  versionId: z.number(),
  hostUserId: z.string().nullable(),
  hostMembershipId: z.number().nullable(),
  sessionCode: z.string(),
  status: z.enum(["draft", "waiting", "active", "paused", "ended"]),
  currentQuestionId: z.number().nullable(),
  startedAt: z.string().nullable(),
  endedAt: z.string().nullable(),
  settings: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
});

export const liveSessionResultsContract = z.object({
  participantCount: z.number(),
  revealed: z.boolean(),
  question: z.object({
    responseCount: z.number(),
    choiceDistribution: z.array(
      z.object({
        choiceId: z.number(),
        label: z.string(),
        count: z.number(),
        isCorrect: z.boolean(),
      }),
    ),
  }).nullable(),
});

const surveyResponseSessionRowContract = z.object({
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
  status: z.enum(["in_progress", "submitted", "abandoned", "expired"]),
});

export const surveyPublicLiveSessionContract = surveyResponseSessionRowContract.and(
  z.object({
    currentQuestion: z.object({
      id: z.number(),
      questionKey: z.string(),
      type: z.string(),
      title: z.string(),
      description: z.string().nullable(),
      required: z.boolean(),
      settings: z.record(z.string(), z.unknown()),
      choices: z.array(z.object({
        id: z.number(),
        choiceKey: z.string(),
        label: z.string(),
        value: z.string().nullable(),
        score: z.number().nullable(),
        sortOrder: z.number(),
      })),
    }).nullable(),
  }),
);

export const joinLiveSessionResultContract = z.object({ participantToken: z.string() });

export const submitLiveAnswerContract = z.object({ success: z.literal(true) });
