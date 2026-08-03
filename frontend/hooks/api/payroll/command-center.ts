"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { CommandCenterData } from "@/types/payroll/runs";

export function useCommandCenter(month: string) {
  const canView = useCan("payroll:runs:view");
  return useQuery({
    queryKey: queryKeys.payroll.commandCenter(month),
    queryFn: () =>
      apiClient.get<CommandCenterData>("/payroll/command-center", { month }),
    staleTime: 30_000,
    enabled: canView && !!month,
  });
}
