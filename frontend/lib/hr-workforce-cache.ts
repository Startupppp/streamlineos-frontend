import type { QueryClient } from "@tanstack/react-query";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

type QueryInvalidator = Pick<QueryClient, "invalidateQueries">;

export async function invalidateHrWorkforceQueries(
  queryClient: QueryInvalidator,
  userId?: string,
  extraKeys: ReadonlyArray<readonly unknown[]> = [],
): Promise<void> {
  const keys: Array<readonly unknown[]> = [
    humanResourcesQueryKeys.hr.employees(),
    humanResourcesQueryKeys.hr.orgChart(),
    humanResourcesQueryKeys.hr.directory(),
    humanResourcesQueryKeys.hr.onboardingStatus(),
    directoryAndOwnershipQueryKeys.directory.peopleAll,
    directoryAndOwnershipQueryKeys.directory.workersAll,
    humanResourcesQueryKeys.hr.managerCoverage(),
    humanResourcesQueryKeys.hr.myTeam(),
    humanResourcesQueryKeys.hr.myReportingLine(),
    humanResourcesQueryKeys.hr.myApprovers(),
    ...extraKeys,
  ];
  if (userId) {
    keys.push(
      humanResourcesQueryKeys.hr.employee(userId),
      humanResourcesQueryKeys.hr.employeeStats(userId),
      humanResourcesQueryKeys.hr.employeeEmployment(userId),
      humanResourcesQueryKeys.hr.reportingLine(userId),
    );
  }

  await Promise.all(
    keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  );
}
