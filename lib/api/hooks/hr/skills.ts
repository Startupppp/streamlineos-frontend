"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface EmployeeSkill {
  id: number;
  userId: string;
  skillName: string;
  level: number | null;
  verifiedBy: string | null;
  verifiedAt: Date | string | null;
  user?: { id: string; name: string | null } | null;
}

const skillKeys = { all: [...queryKeys.hr.all, "skills"] as const, list: (p?: Record<string, unknown>) => [...skillKeys.all, "list", p] as const };

export function useEmployeeSkills(params?: { userId?: string }) {
  return useQuery({ queryKey: skillKeys.list(params as Record<string, unknown>), queryFn: () => apiClient.get<EmployeeSkill[]>("/hr/skills", params as Record<string, unknown>) });
}

export function useAddSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { skillName: string; level?: number; userId?: string }) =>
      apiClient.post<EmployeeSkill>("/hr/skills", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: skillKeys.all }),
  });
}
