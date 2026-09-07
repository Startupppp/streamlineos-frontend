import { z } from "zod";

const builderChoiceContract = z.object({
  id: z.number(),
  choiceKey: z.string(),
  label: z.string(),
  value: z.string().nullable(),
  score: z.number().nullable(),
  sortOrder: z.number(),
  isCorrect: z.boolean(),
});

const builderQuestionContract = z.object({
  id: z.number(),
  questionKey: z.string(),
  variableName: z.string().nullable(),
  type: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  required: z.boolean(),
  settings: z.record(z.string(), z.unknown()),
  validation: z.record(z.string(), z.unknown()),
  scoring: z.record(z.string(), z.unknown()),
  sortOrder: z.number(),
  choices: z.array(builderChoiceContract),
});

const builderSectionContract = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  sortOrder: z.number(),
  settings: z.record(z.string(), z.unknown()),
  questions: z.array(builderQuestionContract),
});

const builderLogicRuleContract = z.object({
  id: z.number(),
  sourceQuestionId: z.number(),
  condition: z.record(z.string(), z.unknown()),
  action: z.record(z.string(), z.unknown()),
  target: z.record(z.string(), z.unknown()).nullable(),
  sortOrder: z.number(),
});

export const surveyBuilderSnapshotContract = z.object({
  sections: z.array(builderSectionContract),
  logicRules: z.array(builderLogicRuleContract),
});

export const surveySectionRowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  surveyId: z.number(),
  versionId: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  sortOrder: z.number(),
  settings: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const surveyQuestionRowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  surveyId: z.number(),
  versionId: z.number(),
  sectionId: z.number(),
  questionKey: z.string(),
  variableName: z.string().nullable(),
  type: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  required: z.boolean(),
  settings: z.record(z.string(), z.unknown()),
  validation: z.record(z.string(), z.unknown()),
  scoring: z.record(z.string(), z.unknown()),
  sortOrder: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  choices: z.array(z.object({
    id: z.number(),
    choiceKey: z.string(),
    label: z.string(),
    value: z.string().nullable(),
    score: z.number().nullable(),
    sortOrder: z.number(),
    isCorrect: z.boolean(),
    createdAt: z.string(),
  })),
});

export const surveyLogicRuleRowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  surveyId: z.number(),
  versionId: z.number(),
  sourceQuestionId: z.number(),
  condition: z.record(z.string(), z.unknown()),
  action: z.record(z.string(), z.unknown()),
  target: z.record(z.string(), z.unknown()).nullable(),
  sortOrder: z.number(),
  createdAt: z.string(),
});

export const builderSuccessContract = z.object({ success: z.literal(true) });
