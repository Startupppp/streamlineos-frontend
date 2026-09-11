"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { payrollQueryKeys } from "@/lib/query-keys/payroll";
import { useCan } from "@/hooks/api/access";
import type { CommandCenterData } from "@/hooks/api/payroll/command-center-schema";

const commandCenterResponseC = lazyContract(() =>
  import("@/hooks/api/payroll/command-center-schema").then((m) => m.commandCenterResponseContract),
);

export type { CommandCenterData };

export function useCommandCenter(month: string) {
  const canView = useCan("payroll:runs:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.commandCenter(month),
    queryFn: ({ signal }) =>
      apiClient.get<CommandCenterData>("/payroll/command-center", { month }, signal, commandCenterResponseC),
    staleTime: 30_000,
    enabled: canView && !!month,
  });
}
