import { z } from "zod";

const riskLevelContract = z.enum(["low", "medium", "high"]);
const riskStatusValueContract = z.enum(["open", "mitigating", "monitoring", "accepted", "closed"]);

export const riskRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  projectId: z.number().int(),
  riskNumber: z.number().int(),
  title: z.string(),
  description: z.string().nullable(),
  probability: riskLevelContract,
  impact: riskLevelContract,
  status: riskStatusValueContract,
  ownerId: z.string().nullable(),
  mitigation: z.string().nullable(),
  linkedTicketId: z.number().int().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const riskListContract = z.array(riskRowContract);

export const decisionRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  projectId: z.number().int(),
  decisionNumber: z.number().int(),
  title: z.string(),
  context: z.string().nullable(),
  decision: z.string().nullable(),
  optionsConsidered: z.string().nullable(),
  status: z.string(),
  ownerId: z.string().nullable(),
  decidedAt: z.string().nullable(),
  revisitAt: z.string().nullable(),
  linkedTicketId: z.number().int().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const decisionListContract = z.array(decisionRowContract);

export const governanceSuccessContract = z.object({ success: z.literal(true) });
