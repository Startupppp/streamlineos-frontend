import { z } from "zod";
import {
  risksListRisksResponseSchema,
  risksGetRiskStatsResponseSchema,
  decisionsListDecisionsResponseSchema,
} from "@/contracts/build-contracts.generated";

export const riskRowContract = risksListRisksResponseSchema.shape.data.element;

export const riskPageContract = risksListRisksResponseSchema;

export const riskMatrixCellContract = risksGetRiskStatsResponseSchema.shape.matrix.element;

export const riskStatsContract = risksGetRiskStatsResponseSchema;

export type RiskMatrixCell = z.infer<typeof riskMatrixCellContract>;
export type RiskStats = z.infer<typeof riskStatsContract>;

export const decisionRowContract = decisionsListDecisionsResponseSchema.shape.data.element;

export const decisionPageContract = decisionsListDecisionsResponseSchema;
