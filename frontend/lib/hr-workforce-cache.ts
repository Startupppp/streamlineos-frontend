import type { QueryClient } from "@tanstack/react-query";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

type QueryInvalidator = Pick<QueryClient, "invalidateQueries">;

/**
 * Canonical projection fan-out for mutations that change workforce identity,
 * employment state, placement, or reporting relationships.
 *
 * `extraKeys` lets a caller add the keys only it touches (a request, a bulk
 * job) without every caller paying for them.
 */
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
    // Manager home (direct reports) and the viewer's own line move with any
    // reporting change: the viewer may be the employee or either manager.
    humanResourcesQueryKeys.hr.myTeam(),
    humanResourcesQueryKeys.hr.myReportingLine(),
    // Direct-manager approver lookups route on the primary line.
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
