"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { lazyContract } from "@/lib/api-envelope";
import { payrollQueryKeys } from "@/lib/query-keys/payroll";
import { useCan } from "@/hooks/api/access";
import type { PayrollPeoplePage } from "@/hooks/api/payroll/people-schema";

const payrollPeopleC = lazyContract(() =>
  import("@/hooks/api/payroll/people-schema").then((m) => m.payrollPeoplePageContract),
);

export function usePayrollPeople(params: { search?: string; limit?: number }, options?: { enabled?: boolean }) {
  const canView = useCan("payroll:salaries:view");
  const query = { search: params.search || undefined, limit: params.limit ?? 50 };
  return useQuery({
    queryKey: payrollQueryKeys.payroll.people(query),
    queryFn: ({ signal }) => apiClient.get<PayrollPeoplePage>("/payroll/people", query, signal, payrollPeopleC),
    staleTime: 30_000,
    enabled: canView && (options?.enabled ?? true),
    ...INLINE_READ_ERROR,
  });
}
