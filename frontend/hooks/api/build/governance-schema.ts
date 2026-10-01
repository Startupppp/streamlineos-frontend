import { z } from "zod";
import { DB_ENUMS } from "@/contracts/db-enums.generated";
import { genRiskPageSchema, genRiskStatsSchema, genDecisionPageSchema } from "@/contracts/build-contracts.generated";

const riskLevelContract = z.enum(DB_ENUMS.risk_probability);
const riskStatusValueContract = z.enum(DB_ENUMS.risk_status);
const decisionStatusValueContract = z.enum(DB_ENUMS.decision_status);

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

export const riskPageContract = genRiskPageSchema;

export const riskMatrixCellContract = z.object({
  probability: riskLevelContract,
  impact: riskLevelContract,
  openCount: z.number().int(),
});

export const riskStatsContract = genRiskStatsSchema;

export type RiskMatrixCell = z.infer<typeof riskMatrixCellContract>;
export type RiskStats = z.infer<typeof riskStatsContract>;

export const decisionRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  projectId: z.number().int(),
  decisionNumber: z.number().int(),
  title: z.string(),
  context: z.string().nullable(),
  decision: z.string().nullable(),
  optionsConsidered: z.string().nullable(),
  status: decisionStatusValueContract,
  ownerId: z.string().nullable(),
  decidedAt: z.string().nullable(),
  revisitAt: z.string().nullable(),
  linkedTicketId: z.number().int().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const decisionPageContract = genDecisionPageSchema;

export const governanceSuccessContract = z.object({ success: z.literal(true) });
