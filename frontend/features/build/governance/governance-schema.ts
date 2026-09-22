import { z } from "zod";

export const decisionFormSchema = z.object({
  title: z.string().min(1, "Required").max(200),
  context: z.string(),
  decision: z.string(),
  optionsConsidered: z.string(),
  status: z.enum(["proposed", "accepted", "superseded", "revisit"]),
  ownerId: z.string(),
  decidedAt: z.string(),
  revisitAt: z.string(),
  linkedTicketId: z.string(),
});

export type DecisionFormValues = z.infer<typeof decisionFormSchema>;

export const riskFormSchema = z.object({
  title: z.string().min(1, "Required").max(200),
  description: z.string(),
  probability: z.enum(["low", "medium", "high"]),
  impact: z.enum(["low", "medium", "high"]),
  status: z.enum(["open", "mitigating", "monitoring", "accepted", "closed"]),
  ownerId: z.string(),
  mitigation: z.string(),
  linkedTicketId: z.string(),
});

export type RiskFormValues = z.infer<typeof riskFormSchema>;
