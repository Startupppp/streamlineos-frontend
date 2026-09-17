"use client";

import { useGatedQuery } from "@/hooks/api/gated-query";
import { apiClient } from "@/lib/api-client";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import { lazyContract } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";

const employmentFactsContract = lazyContract(() =>
  import("@/hooks/api/directory/employment-schema").then((m) => m.employmentFactsContract),
);

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
    queryKey: directoryAndOwnershipQueryKeys.directory.employment(wanted),
    queryFn: ({ signal }) =>
      apiClient.get<EmploymentFactsResponse>("/directory/employment", {
        userIds: wanted.join(","),
      }, signal, employmentFactsContract),
    staleTime: 30_000,
    ...INLINE_READ_ERROR,
    enabled: wanted.length > 0,
  });

  const byUserId = new Map<string, EmploymentFacts>(
    (query.data?.data ?? []).map((facts) => [facts.userId, facts]),
  );

  return { ...query, byUserId };
};
