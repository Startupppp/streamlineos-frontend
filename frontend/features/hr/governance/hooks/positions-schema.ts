import { z } from "zod";

const cursorPaginationContract = z.object({
  limit: z.number().int(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

export const positionContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  title: z.string(),
  departmentId: z.string().nullable(),
  jobLevelId: z.number().int().nullable(),
  status: z.string(),
  budgetedCostCents: z.number().int().nullable(),
  effectiveFrom: z.string(),
  incumbentUserId: z.string().nullable(),
  futureDated: z.boolean(),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const positionListContract = z.object({
  data: z.array(positionContract),
  pagination: cursorPaginationContract,
});

export const positionStatusContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  order: z.number().int(),
  color: z.string().nullable(),
  lifecycleGroup: z.enum(["backlog", "unstarted", "started", "completed", "cancelled"]),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const positionStatusListContract = z.array(positionStatusContract);

export const reorgScenarioContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  status: z.enum(["draft", "proposed", "applied"]),
  changes: z.record(z.string(), z.unknown()),
  createdBy: z.string().nullable(),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const reorgScenarioListContract = z.object({
  data: z.array(reorgScenarioContract),
  pagination: cursorPaginationContract,
});

export const simulationResultContract = z.object({
  scenarioId: z.number().int(),
  scenarioName: z.string(),
  status: z.string(),
  projectedEffect: z.object({
    affectedPositions: z.number().int(),
    affectedReportingLines: z.number().int(),
    positionMoves: z.array(z.unknown()),
    reportingMoves: z.array(z.unknown()),
  }),
  warning: z.string(),
});

export type PositionResponse = z.infer<typeof positionContract>;
export type ReorgScenarioResponse = z.infer<typeof reorgScenarioContract>;
export type SimulationResultResponse = z.infer<typeof simulationResultContract>;

export const positionDeleteContract = z.undefined();
