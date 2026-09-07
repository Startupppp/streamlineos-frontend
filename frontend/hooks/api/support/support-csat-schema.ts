import { z } from "zod";

const csatSourceStatsContract = z.object({
  totalRequests: z.number().int(),
  totalResponses: z.number().int(),
  responseRate: z.number(),
  averageScore: z.number().nullable(),
});

export const csatReportContract = z.object({
  totalRequests: z.number().int(),
  totalResponses: z.number().int(),
  responseRate: z.number(),
  averageScore: z.number().nullable(),
  sources: z.object({
    ticket: csatSourceStatsContract,
    crmCampaigns: csatSourceStatsContract.nullable(),
    generalSurveys: z.union([
      csatSourceStatsContract,
      z.object({ excluded: z.literal(true), reason: z.string() }),
    ]),
  }),
});

export const csatByTokenContract = z.object({
  ticketId: z.number().int().optional(),
  ticketTitle: z.string().optional(),
  alreadyResponded: z.boolean(),
});

export const csatSubmitResultContract = z.object({
  success: z.literal(true),
  score: z.number().int(),
});
