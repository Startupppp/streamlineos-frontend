import { z } from "zod";
import { idCursorPageContract } from "@/hooks/api/cursor-page-schema";

const riskLevelContract = z.enum(["low", "medium", "high"]);
const riskStatusValueContract = z.enum(["open", "mitigating", "monitoring", "accepted", "closed"]);
const decisionStatusValueContract = z.enum(["proposed", "accepted", "superseded", "revisit"]);

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

export const riskPageContract = idCursorPageContract(riskRowContract);

export const riskMatrixCellContract = z.object({
  probability: riskLevelContract,
  impact: riskLevelContract,
  openCount: z.number().int(),
});

export const riskStatsContract = z.object({
  total: z.number().int(),
  open: z.number().int(),
  closed: z.number().int(),
  highCritical: z.number().int(),
  matrix: z.array(riskMatrixCellContract),
});

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

export const decisionPageContract = idCursorPageContract(decisionRowContract);

export const governanceSuccessContract = z.object({ success: z.literal(true) });
