import { z } from "zod";

export const surveyFormRowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  mode: z.enum(["survey", "assessment", "live_session", "lead_qualification", "custom"]),
  status: z.enum(["draft", "testing", "published", "paused", "closed", "archived"]),
  ownerUserId: z.string().nullable(),
  ownerMembershipId: z.number().nullable(),
  defaultLanguage: z.string(),
  activeVersionId: z.number().nullable(),
  settings: z.record(z.string(), z.unknown()),
  branding: z.record(z.string(), z.unknown()),
  createdBy: z.string().nullable(),
  createdByMembershipId: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  archivedAt: z.string().nullable(),
});

export const surveyFormListContract = z.object({
  items: z.array(surveyFormRowContract),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

const surveyTemplateChoiceContract = z.object({
  choiceKey: z.string(),
  label: z.string(),
  value: z.string().optional(),
  score: z.number().optional(),
  isCorrect: z.boolean().optional(),
});

const surveyTemplateQuestionContract = z.object({
  type: z.string(),
  title: z.string(),
  required: z.boolean().optional(),
  variableName: z.string().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  choices: z.array(surveyTemplateChoiceContract).optional(),
});

const surveyTemplateSectionContract = z.object({
  title: z.string(),
  questions: z.array(surveyTemplateQuestionContract),
});

export const surveyTemplateContract = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string(),
  mode: z.enum(["survey", "assessment", "live_session", "lead_qualification", "custom"]),
  category: z.string(),
  sections: z.array(surveyTemplateSectionContract),
});

export const surveyTemplateListContract = z.array(surveyTemplateContract);

export const surveyVersionRowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  surveyId: z.number(),
  versionNumber: z.number(),
  schemaSnapshot: z.record(z.string(), z.unknown()).nullable(),
  publishedAt: z.string().nullable(),
  createdByMembershipId: z.number().nullable(),
  createdAt: z.string(),
});

export const surveyAttemptRowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  surveyId: z.number(),
  versionId: z.number(),
  participantId: z.number().nullable(),
  sessionId: z.number().nullable(),
  attemptNumber: z.number(),
  status: z.enum(["pending", "in_progress", "passed", "failed", "expired"]),
  score: z.number().nullable(),
  passed: z.boolean().nullable(),
  startedAt: z.string().nullable(),
  submittedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
});

export const surveyAttemptListContract = z.object({
  items: z.array(surveyAttemptRowContract),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

export const surveyCertificateRowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  surveyId: z.number(),
  participantId: z.number(),
  attemptId: z.number(),
  certificateNumber: z.string(),
  issuedAt: z.string(),
  expiresAt: z.string().nullable(),
  fileUrl: z.string().nullable(),
});

export const surveyCertificateListContract = z.array(surveyCertificateRowContract);
