"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface CareerPathLevel {
  title: string;
  level: number;
  skills: string[];
  requirements: string[];
}

export interface CareerPath {
  id: number;
  orgId: string;
  name: string;
  description?: string;
  department?: string;
  levels: CareerPathLevel[];
  isActive: boolean;
  createdAt: string;
}

export interface Milestone {
  title: string;
  dueDate: string;
  completed: boolean;
}

export interface CareerPlan {
  id: number;
  orgId: string;
  userId: string;
  pathId?: number;
  currentLevel: number;
  targetRole?: string;
  targetDate?: string;
  aspirations?: string;
  mentorId?: string;
  milestones: Milestone[];
  createdAt: string;
  updatedAt: string;
}

export function useCareerPaths() {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "career"],
    queryFn: () => apiClient.get<CareerPath[]>("/hr/career-development"),
    staleTime: 300_000,
  });
}

export function useMyCareerPlan() {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "career", "my-plan"],
    queryFn: () => apiClient.get<CareerPlan | null>("/hr/career-development/my-plan"),
    staleTime: 60_000,
  });
}

export function useCreateCareerPath() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "career", "create"],
    mutationFn: (data: {
      name: string;
      description?: string;
      department?: string;
      levels: CareerPathLevel[];
    }) => apiClient.post<CareerPath>("/hr/career-development", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "career"] }),
  });
}

export function useUpdateCareerPath() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "career", "update"],
    mutationFn: ({ pathId, ...data }: { pathId: number } & Partial<Pick<CareerPath, "name" | "description" | "department" | "levels" | "isActive">>) =>
      apiClient.patch<CareerPath>(`/hr/career-development/${pathId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "career"] }),
  });
}

export function useSaveMyPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "career", "saveMyPlan"],
    mutationFn: (data: Partial<Pick<CareerPlan, "pathId" | "currentLevel" | "targetRole" | "targetDate" | "aspirations" | "mentorId" | "milestones">>) =>
      apiClient.put<CareerPlan>("/hr/career-development/my-plan", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "career", "my-plan"] }),
  });
}

export function useUpdateCareerMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "career", "updateMilestone"],
    mutationFn: ({ idx, completed }: { idx: number; completed: boolean }) =>
      apiClient.patch<CareerPlan>(`/hr/career-development/my-plan/milestones/${idx}`, { completed }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "career", "my-plan"] }),
  });
}
