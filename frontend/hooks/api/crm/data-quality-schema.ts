import { z } from "zod";

const dataQualityAggregateSchema = z.object({
  count: z.number().int(),
  offenders: z.array(
    z.object({
      id: z.union([z.number().int(), z.string()]),
      name: z.string(),
      detail: z.string().optional(),
    }),
  ),
});

export const dataQualityReportContract = z.object({
  leadsWithoutEmail: dataQualityAggregateSchema,
  leadsWithInvalidPhone: dataQualityAggregateSchema,
  duplicateLeads: dataQualityAggregateSchema,
  duplicateCompanies: dataQualityAggregateSchema,
  staleDeals: dataQualityAggregateSchema,
  dealsWithNoNextActivity: dataQualityAggregateSchema,
  leadsWithNoOwner: dataQualityAggregateSchema,
  dealsMissingStageFields: dataQualityAggregateSchema,
});
