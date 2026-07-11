"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface SkillGap {
  userId: string;
  gaps: Array<{
    skillName: string;
    requiredLevel: number;
    currentLevel: number;
    gap: number;
  }>;
}

export interface RoleSkillRequirement {
  id: number;
  orgId: string;
  jobRoleId: number | null;
  roleName: string | null;
  skillName: string;
  requiredLevel: number;
  createdAt: string;
}

const keys = {
  gaps: (params: { employeeId?: string; departmentId?: number }) =>
    ["hr", "skill-gap", "gaps", params] as const,
  requirements: () => ["hr", "skill-gap", "requirements"] as const,
};

export function useSkillGaps(params: { employeeId?: string; departmentId?: number }) {
  const sp = new URLSearchParams();
  if (params.employeeId) sp.set("employeeId", params.employeeId);
  if (params.departmentId) sp.set("departmentId", String(params.departmentId));

  return useQuery({
    queryKey: keys.gaps(params),
    queryFn: () => apiClient.get<SkillGap[]>(`/hr/skills/gaps?${sp}`),
    staleTime: 60_000,
    enabled: !!(params.employeeId || params.departmentId),
  });
}

export function useRoleSkillRequirements() {
  return useQuery({
    queryKey: keys.requirements(),
    queryFn: () => apiClient.get<RoleSkillRequirement[]>("/hr/skills/requirements"),
    staleTime: 60_000,
  });
}

export function useAddRoleSkillRequirement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { jobRoleId?: number; roleName?: string; skillName: string; requiredLevel: number }) =>
      apiClient.post<RoleSkillRequirement>("/hr/skills/requirements", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.requirements() }),
  });
}

export function useRemoveRoleSkillRequirement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/hr/skills/requirements/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.requirements() }),
  });
}
