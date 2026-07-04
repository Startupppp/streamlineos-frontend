"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { CommandCenterData } from "@/types/payroll/runs";

const commandCenterKeys = {
  all: ["payroll", "command-center"] as const,
  byMonth: (month: string) => ["payroll", "command-center", month] as const,
};

export function useCommandCenter(month: string) {
  return useQuery({
    queryKey: commandCenterKeys.byMonth(month),
    queryFn: () =>
      apiClient.get<CommandCenterData>("/payroll/command-center", { month }),
    staleTime: 30_000,
  });
}
