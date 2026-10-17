import { z } from "zod";

/** Wire contracts for `customer-executive/nps` (customer-executive-response.schemas.ts). */

const npsSurveyContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  title: z.string(),
  question: z.string(),
  status: z.string(),
  publicToken: z.string(),
  createdBy: z.string().nullable(),
  createdByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const npsSurveyWithStatsContract = npsSurveyContract.extend({
  responseCount: z.number().int(),
  promoters: z.number().int(),
  passives: z.number().int(),
  detractors: z.number().int(),
  nps: z.number(),
});

const npsBreakdownContract = z.object({
  promoters: z.number().int(),
  passives: z.number().int(),
  detractors: z.number().int(),
  total: z.number().int(),
});

const npsResponseContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  surveyId: z.number().int(),
  score: z.number().int(),
  category: z.string(),
  comment: z.string().nullable(),
  respondentName: z.string().nullable(),
  respondentEmail: z.string().nullable(),
  clientAccountId: z.number().int().nullable(),
  createdAt: z.string(),
});

export const npsSurveyListContract = z.array(npsSurveyWithStatsContract);
export const npsSurveyCreateContract = npsSurveyWithStatsContract;
export const npsSurveyUpdateContract = npsSurveyContract;

export const npsStatsContract = z.object({
  activeSurveys: z.number().int(),
  breakdown: npsBreakdownContract,
  nps: z.number(),
  trend: z.array(z.object({ category: z.string(), createdAt: z.string() })),
});

export const npsSurveyDetailContract = z.object({
  survey: npsSurveyContract,
  responses: z.array(npsResponseContract),
  breakdown: npsBreakdownContract,
  nps: z.number(),
});

export const npsDeleteContract = z.object({ success: z.literal(true) });

export type NpsSurvey = z.infer<typeof npsSurveyWithStatsContract>;
export type NpsResponse = z.infer<typeof npsResponseContract>;
export type NpsSurveyDetail = z.infer<typeof npsSurveyDetailContract>;
