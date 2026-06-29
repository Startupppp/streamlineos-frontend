"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface AssessmentAttempt {
  id: number;
  score: number | null;
  passed: boolean;
}

export interface Assessment {
  id: number;
  title: string;
  skillName: string;
  questions: { id: string; question: string; options: string[]; correctIndex: number }[] | null;
  passingScore: number;
  timeLimit: number | null;
  createdAt: string;
  attempts: AssessmentAttempt[];
}

export type AssessStatus = "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED";

const assessKeys = {
  all: [...queryKeys.hr.all, "assessments"] as const,
  list: () => [...assessKeys.all, "list"] as const,
};

export function useAssessments() {
  return useQuery({
    queryKey: assessKeys.list(),
    queryFn: () => apiClient.get<Assessment[]>("/hr/assessments"),
    staleTime: 2 * 60_000,
  });
}

export function useCreateAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; skillName?: string; durationMinutes?: number }) =>
      apiClient.post<Assessment>("/hr/assessments", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: assessKeys.list() }),
  });
}
