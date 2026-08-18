import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

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
    queryKeys.hr.employees(),
    queryKeys.hr.orgChart(),
    queryKeys.hr.directory(),
    queryKeys.hr.onboardingStatus(),
    queryKeys.directory.peopleAll,
    queryKeys.directory.workersAll,
  ];
  if (userId) {
    keys.push(
      queryKeys.hr.employee(userId),
      queryKeys.hr.employeeStats(userId),
      queryKeys.hr.employeeEmployment(userId),
    );
  }

  await Promise.all(
    keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  );
}
