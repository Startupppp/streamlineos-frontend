import {
  projectsReportsVelocityResponseSchema,
  projectsReportsBurnupResponseSchema,
  projectsReportsCfdResponseSchema,
  projectsReportsCriticalPathResponseSchema,
  projectsReportsGetCycleTimeResponseSchema,
  projectsReportsGetLeadTimeResponseSchema,
  projectsReportsSnapshotResponseSchema,
} from "@/contracts/build-contracts.generated";

export const velocityContract = projectsReportsVelocityResponseSchema;
export const burnupDataContract = projectsReportsBurnupResponseSchema;
export const cfdDataContract = projectsReportsCfdResponseSchema;
export const criticalPathContract = projectsReportsCriticalPathResponseSchema;
export const cycleTimeContract = projectsReportsGetCycleTimeResponseSchema;
export const leadTimeContract = projectsReportsGetLeadTimeResponseSchema;

export const snapshotResultContract = projectsReportsSnapshotResponseSchema;
