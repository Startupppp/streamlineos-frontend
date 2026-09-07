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

export const summarizeNotesContract = z.object({
  summary: z.string(),
  actionItems: z.array(z.string()),
  objections: z.array(z.string()),
  sentiment: z.enum(["positive", "neutral", "negative"]),
});

export const objectionHelpContract = z.object({
  counterArguments: z.array(z.string()),
  talkingPoints: z.array(z.string()),
  suggestedResponse: z.string(),
});

const citationSchema = z.object({
  id: z.string(),
  title: z.string(),
  snippet: z.string().optional(),
});

export const duplicateSuggestionsContract = z.object({
  leadId: z.number().int(),
  duplicates: z.array(z.object({
    leads: z.array(z.object({
      id: z.number().int(),
      name: z.string(),
      email: z.string().nullable(),
      phone: z.string().nullable(),
      company: z.string().nullable(),
      status: z.string(),
    })),
    matchReason: z.array(z.string()),
    score: z.number(),
  })),
  aiExplanation: z.string(),
  generatedAt: z.string(),
});

export const leadSummaryWithCitationsContract = z.object({
  summary: z.string(),
  nextBestActions: z.array(z.string()),
  citations: z.array(citationSchema),
  generatedAt: z.string(),
});

export const dealSummaryWithCitationsContract = z.object({
  stage: z.string(),
  summary: z.string(),
  risks: z.array(z.string()),
  recommendedPlays: z.array(z.string()),
  stakeholdersGap: z.string(),
  citations: z.array(citationSchema),
  generatedAt: z.string(),
});

export const accountSummaryWithCitationsContract = z.object({
  summary: z.string(),
  clientName: z.string(),
  citations: z.array(citationSchema),
  generatedAt: z.string(),
});

export const meetingFollowUpContract = z.object({
  draft: z.string(),
  attendeeName: z.string(),
  generatedAt: z.string(),
});
