import type { QueryClient } from "@tanstack/react-query";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

type QueryInvalidator = Pick<QueryClient, "invalidateQueries">;

/**
 * Canonical projection fan-out for mutations that change workforce identity,
 * employment state, placement, or reporting relationships.
 */
export async function invalidateHrWorkforceQueries(
  queryClient: QueryInvalidator,
  userId?: string,
): Promise<void> {
  const keys: Array<readonly unknown[]> = [
    humanResourcesQueryKeys.hr.employees(),
    humanResourcesQueryKeys.hr.orgChart(),
    humanResourcesQueryKeys.hr.directory(),
    humanResourcesQueryKeys.hr.onboardingStatus(),
    directoryAndOwnershipQueryKeys.directory.peopleAll,
    directoryAndOwnershipQueryKeys.directory.workersAll,
  ];
  if (userId) {
    keys.push(
      humanResourcesQueryKeys.hr.employee(userId),
      humanResourcesQueryKeys.hr.employeeStats(userId),
      humanResourcesQueryKeys.hr.employeeEmployment(userId),
    );
  }

  await Promise.all(
    keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  );
}
