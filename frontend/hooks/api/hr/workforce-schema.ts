import { z } from "zod";

const workforcePlanProjectionContract = z.object({
  id: z.number().int(),
  fiscalYear: z.number().int(),
  departmentId: z.string().nullable(),
  departmentName: z.string().nullable(),
  budgetedHeadcount: z.number().int(),
  budgetedCostCents: z.number().int().nullable(),
  note: z.string().nullable(),
  createdAt: z.string(),
});

export const workforcePlansContract = z.array(workforcePlanProjectionContract);

const headcountPlanRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  fiscalYear: z.number().int(),
  departmentId: z.string().nullable(),
  budgetedHeadcount: z.number().int(),
  budgetedCostCents: z.number().int().nullable(),
  note: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createHeadcountPlanContract = z.array(headcountPlanRowContract);

export const updateHeadcountPlanContract = headcountPlanRowContract;

export const budgetVsActualContract = z.array(
  z.object({
    planId: z.number().int(),
    fiscalYear: z.number().int(),
    departmentId: z.string().nullable(),
    departmentName: z.string(),
    budgeted: z.number().int(),
    actual: z.number().int(),
    variance: z.number().int(),
  }),
);

export const skillsGapContract = z.object({
  gaps: z.array(
    z.object({
      skillName: z.string(),
      required: z.number().int(),
      covered: z.number().int(),
      gap: z.number().int(),
    }),
  ),
});

export const successionRiskContract = z.object({
  riskyRoles: z.array(
    z.object({
      id: z.number().int(),
      roleName: z.string(),
      incumbentId: z.string().nullable(),
      readiness: z.string().nullable(),
      hasSuccessor: z.boolean(),
      note: z.string().nullable(),
    }),
  ),
});

export const attritionForecastContract = z.object({
  historical: z.array(z.object({ month: z.string(), exits: z.number().int(), rate: z.number() })),
  forecast: z.array(z.object({ month: z.string(), projectedExits: z.number(), projectedRate: z.number() })),
  disclaimer: z.string(),
});

export type WorkforcePlanResponse = z.infer<typeof workforcePlanProjectionContract>;
export type BudgetVsActualResponse = z.infer<typeof budgetVsActualContract>[number];
export type SkillsGapResponse = z.infer<typeof skillsGapContract>;
export type SuccessionRiskResponse = z.infer<typeof successionRiskContract>;
export type AttritionForecastResponse = z.infer<typeof attritionForecastContract>;
export type HeadcountPlanRow = z.infer<typeof headcountPlanRowContract>;
