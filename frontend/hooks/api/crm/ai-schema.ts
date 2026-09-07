import { z } from "zod";

export const leadSummaryContract = z.object({
  summary: z.string(),
  nextBestActions: z.array(z.string()),
  generatedAt: z.string(),
});

export const dealSummaryContract = z.object({
  stage: z.string(),
  summary: z.string(),
  risks: z.array(z.string()),
  recommendedPlays: z.array(z.string()),
  stakeholdersGap: z.string(),
  generatedAt: z.string(),
});

const evidenceItemSchema = z.object({
  kind: z.enum(["activity", "stage", "signal", "field"]),
  label: z.string(),
  value: z.string(),
});

export const nextBestActionsContract = z.object({
  actions: z.array(
    z.object({
      leadId: z.number().int(),
      leadName: z.string(),
      action: z.string(),
      urgency: z.enum(["low", "medium", "high", "critical"]),
      reasoning: z.string(),
      evidence: z.array(evidenceItemSchema),
      rationale: z.string(),
    }),
  ),
});

export const emailDraftContract = z.object({
  subject: z.string(),
  body: z.string(),
  generatedAt: z.string(),
});

export const leadEnrichmentContract = z.object({
  companyInsight: z.string(),
  estimatedCompanySize: z.string(),
  industry: z.string(),
  talkingPoints: z.array(z.string()),
  potentialNeeds: z.array(z.string()),
  recommendedApproach: z.string(),
});
