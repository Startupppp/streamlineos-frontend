"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface TrainingProgram {
  id: number;
  orgId: string;
  name: string;
  description?: string;
  type: "MANDATORY" | "OPTIONAL" | "COMPLIANCE";
  format: "CLASSROOM" | "VIRTUAL" | "BLENDED" | "SELF_PACED";
  startDate: string;
  endDate?: string;
  venue?: string;
  virtualLink?: string;
  maxCapacity?: number;
  instructorId?: string;
  externalInstructor?: string;
  isMandatory: boolean;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  createdAt: string;
}

export interface TrainingAttendance {
  id: number;
  programId: number;
  userId: string;
  status: "ENROLLED" | "ATTENDED" | "ABSENT" | "CANCELLED";
  feedbackRating?: number;
  feedbackText?: string;
  certificateUrl?: string;
  createdAt: string;
}

export type CreateProgramInput = Omit<TrainingProgram, "id" | "orgId" | "createdAt">;
export type UpdateProgramInput = Partial<Omit<TrainingProgram, "id" | "orgId" | "createdAt">>;
export type MarkAttendanceInput = Partial<Pick<TrainingAttendance, "status" | "feedbackRating" | "feedbackText" | "certificateUrl">>;

export function useTrainingPrograms() {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "training"],
    queryFn: () => apiClient.get<TrainingProgram[]>("/hr/training"),
    staleTime: 120_000,
  });
}

export function useTrainingAttendance(programId: number) {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "trainingAttendance", programId],
    queryFn: () => apiClient.get<TrainingAttendance[]>(`/hr/training/${programId}/attendance`),
    staleTime: 60_000,
    enabled: programId > 0,
  });
}

export function useCreateTrainingProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "training", "create"],
    mutationFn: (data: CreateProgramInput) =>
      apiClient.post<TrainingProgram>("/hr/training", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "training"] }),
  });
}

export function useUpdateTrainingProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "training", "update"],
    mutationFn: ({ programId, ...data }: UpdateProgramInput & { programId: number }) =>
      apiClient.patch<TrainingProgram>(`/hr/training/${programId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "training"] }),
  });
}

export function useEnrollTraining() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "training", "enroll"],
    mutationFn: (programId: number) =>
      apiClient.post<TrainingAttendance>(`/hr/training/${programId}/enroll`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "training"] }),
  });
}

export function useMarkAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "training", "markAttendance"],
    mutationFn: ({ programId, userId, ...data }: MarkAttendanceInput & { programId: number; userId: string }) =>
      apiClient.patch<TrainingAttendance>(`/hr/training/${programId}/attendance/${userId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "training"] }),
  });
}
