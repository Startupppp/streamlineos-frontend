"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  ProjectSummaryResult,
  ProjectRisksResult,
  ClientUpdateResult,
  PlanResult,
  ExtractTasksResult,
  AskResult,
  WeeklyUpdateResult,
  ChangeImpactResult,
} from "@/types/projects/ai";

export function useProjectAiSummary(pid: number) {
  return useMutation({
    mutationKey: ["projects", pid, "ai", "summary"],
    mutationFn: () =>
      apiClient.post<ProjectSummaryResult>(`/ai/projects/${pid}/summary`),
  });
}

export function useProjectAiRisks(pid: number) {
  return useMutation({
    mutationKey: ["projects", pid, "ai", "risks"],
    mutationFn: () =>
      apiClient.post<ProjectRisksResult>(`/ai/projects/${pid}/risks`),
  });
}

export function useDraftClientUpdate(pid: number) {
  return useMutation({
    mutationKey: ["projects", pid, "ai", "client-update"],
    mutationFn: () =>
      apiClient.post<ClientUpdateResult>(`/ai/projects/${pid}/client-update`),
  });
}

export function usePlanFromPrompt(pid: number) {
  return useMutation({
    mutationKey: ["projects", pid, "ai", "plan"],
    mutationFn: (input: { prompt: string }) =>
      apiClient.post<PlanResult>(`/ai/projects/${pid}/plan`, input),
  });
}

export function useExtractTasks(pid: number) {
  return useMutation({
    mutationKey: ["projects", pid, "ai", "extract-tasks"],
    mutationFn: (input: { text: string }) =>
      apiClient.post<ExtractTasksResult>(`/ai/projects/${pid}/extract-tasks`, input),
  });
}

export function useAskProjectAi(pid: number) {
  return useMutation({
    mutationKey: ["projects", pid, "ai", "ask"],
    mutationFn: (input: { question: string }) =>
      apiClient.post<AskResult>(`/ai/projects/${pid}/ask`, input),
  });
}

export function useWeeklyUpdate(pid: number) {
  return useMutation({
    mutationKey: ["projects", pid, "ai", "weekly-update"],
    mutationFn: (input?: { startDate?: string; endDate?: string }) =>
      apiClient.post<WeeklyUpdateResult>(`/ai/projects/${pid}/weekly-update`, input ?? {}),
  });
}

export function useChangeImpact(pid: number) {
  return useMutation({
    mutationKey: ["projects", pid, "ai", "change-impact"],
    mutationFn: () =>
      apiClient.post<ChangeImpactResult>(`/ai/projects/${pid}/change-impact`),
  });
}
