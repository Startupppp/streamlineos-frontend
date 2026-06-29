"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";


export interface OnboardingStatus {
  userId: string;
  userName: string;
  totalTasks: number;
  completedTasks: number;
  percentComplete: number;
  lastCompletedAt: string | null;
}

export interface OnboardingTask {
  id: number;
  userId: string;
  orgId: string;
  templateStepId: number | null;
  title: string;
  description: string | null;
  ownerRole: string;
  dueDate: string | null;
  status: string;
  completedAt: string | null;
  completedBy: string | null;
  createdAt: string | null;
}

export function useOnboardingStatus() {
  return useQuery<OnboardingStatus[]>({
    queryKey: queryKeys.hr.onboardingStatus(),
    queryFn: () => apiClient.get<OnboardingStatus[]>("/onboarding"),
  });
}


export function useUserOnboarding(userId: string) {
  return useQuery<OnboardingTask[]>({
    queryKey: queryKeys.hr.onboardingUser(userId),
    queryFn: () => apiClient.get<OnboardingTask[]>(`/onboarding/${userId}`),
    enabled: !!userId,
  });
}


export function useCompleteOnboardingTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: "COMPLETED" | "PENDING" }) =>
      apiClient.patch<{ success: boolean }>(`/onboarding/tasks/${taskId}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.onboardingAll });
    },
  });
}


export function useInitiateOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiClient.post<{ success: boolean; tasksCreated: number }>("/onboarding", { userId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.onboardingStatus() });
    },
  });
}


