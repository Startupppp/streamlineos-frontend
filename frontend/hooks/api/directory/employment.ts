"use client";

import { useGatedQuery } from "@/hooks/api/gated-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface EmploymentFacts {
  userId: string;
  employmentId: number | null;
  employeeNumber: string | null;
  designation: string | null;
  joiningDate: string | null;
  departmentId: string | null;
  locationId: string | null;
  managerUserId: string | null;
}

interface EmploymentFactsResponse {
  data: EmploymentFacts[];
}

export const useEmploymentFacts = (userIds: readonly string[]) => {
  const wanted = [...new Set(userIds.filter(Boolean))].slice(0, 100);

  const query = useGatedQuery<EmploymentFactsResponse, Error>("settings:view", {
    queryKey: queryKeys.directory.employment(wanted),
    queryFn: ({ signal }) =>
      apiClient.get<EmploymentFactsResponse>("/directory/employment", {
        userIds: wanted.join(","),
      }, signal),
    staleTime: 30_000,
    enabled: wanted.length > 0,
  });

  const byUserId = new Map<string, EmploymentFacts>(
    (query.data?.data ?? []).map((facts) => [facts.userId, facts]),
  );

  return { ...query, byUserId };
};
