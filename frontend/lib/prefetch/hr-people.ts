import "server-only";

import { dehydrate, QueryClient } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { serverGet } from "@/lib/server-fetch";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { employeeListPageContract } from "@/hooks/api/hr/employee-list-schema";
import { onboardingStatusPageContract } from "@/hooks/api/hr/onboarding-schema";

const EMPLOYEES_LIMIT = 20;
const ONBOARDING_LIMIT = 25;

export async function prefetchHrEmployees() {
  try {
    const queryClient = await createServerQueryClient();
    const params = { limit: EMPLOYEES_LIMIT };
    await queryClient.prefetchQuery({
      queryKey: humanResourcesQueryKeys.hr.employees(params),
      queryFn: () =>
        serverGet(`/hr/employees?limit=${EMPLOYEES_LIMIT}`, employeeListPageContract),
      staleTime: 2 * 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrOnboarding() {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: humanResourcesQueryKeys.hr.onboardingStatusPage(undefined, ONBOARDING_LIMIT),
      queryFn: () =>
        serverGet(
          `/onboarding/progress?limit=${ONBOARDING_LIMIT}`,
          onboardingStatusPageContract,
        ),
      staleTime: 2 * 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}
