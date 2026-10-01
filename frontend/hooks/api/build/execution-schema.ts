import {
  cyclesListCyclesResponseSchema,
  cyclesCreateCycleResponseSchema,
  modulesListModulesResponseSchema,
  modulesCreateModuleResponseSchema,
  epicsListEpicsResponseSchema,
  workloadCapacityCapacityResponseSchema,
  type WorkloadCapacityCapacityResponse,
} from "@/contracts/build-contracts.generated";

export const cyclePageContract = cyclesListCyclesResponseSchema;
export const cycleListContract = cyclesListCyclesResponseSchema;
export const cycleRowContract = cyclesCreateCycleResponseSchema;

export const moduleListContract = modulesListModulesResponseSchema.shape.data;
export const modulePageContract = modulesListModulesResponseSchema;
export const moduleResponseContract = modulesListModulesResponseSchema;
export const moduleRowContract = modulesCreateModuleResponseSchema;

export const epicPageContract = epicsListEpicsResponseSchema.transform((page) => ({
  ...page,
  data: page.data.map((row) => ({
    ...row,
    assignee: row.assignee?.user ?? null,
  })),
}));

export const memberCapacityItemSchema = workloadCapacityCapacityResponseSchema.shape.members.element;
export const workloadCapacityContract = workloadCapacityCapacityResponseSchema;

export type MemberCapacityItem = WorkloadCapacityCapacityResponse["members"][number];
