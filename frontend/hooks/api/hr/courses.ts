"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface Course {
  id: number;
  orgId: string;
  categoryId?: number;
  title: string;
  description?: string;
  instructorId?: string;
  externalInstructor?: string;
  type: "INTERNAL" | "EXTERNAL" | "BLENDED";
  format: "SELF_PACED" | "ILT" | "VIRTUAL" | "BLENDED";
  durationHours?: string;
  thumbnailUrl?: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isMandatory: boolean;
  tags: string[];
  createdAt: string;
}

export interface CourseCategory {
  id: number;
  orgId: string;
  name: string;
  description?: string;
}

export interface CourseEnrollment {
  id: number;
  courseId: number;
  userId: string;
  status: "ENROLLED" | "IN_PROGRESS" | "COMPLETED" | "DROPPED";
  progressPct: string;
  completedAt?: string;
  score?: string;
}

export function useCourses() {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "courses"],
    queryFn: () => apiClient.get<Course[]>("/hr/courses"),
    staleTime: 120_000,
  });
}

export function useCourseCategories() {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "courseCategories"],
    queryFn: () => apiClient.get<CourseCategory[]>("/hr/courses/categories"),
    staleTime: 300_000,
  });
}

export function useMyEnrollments() {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "myEnrollments"],
    queryFn: () => apiClient.get<CourseEnrollment[]>("/hr/courses/my-enrollments"),
    staleTime: 60_000,
  });
}

export function useCreateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "courses", "create"],
    mutationFn: (data: Omit<Course, "id" | "orgId" | "createdAt">) =>
      apiClient.post<Course>("/hr/courses", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["streamlineos", "hr", "courses"] }),
  });
}

export function useUpdateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "courses", "update"],
    mutationFn: ({ courseId, ...data }: { courseId: number } & Partial<Omit<Course, "id" | "orgId" | "createdAt">>) =>
      apiClient.patch<Course>(`/hr/courses/${courseId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["streamlineos", "hr", "courses"] }),
  });
}

export function useEnrollCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "courses", "enroll"],
    mutationFn: (courseId: number) =>
      apiClient.post<CourseEnrollment>(`/hr/courses/${courseId}/enroll`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["streamlineos", "hr", "courses"] }),
  });
}

export function useUpdateProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "courses", "updateProgress"],
    mutationFn: ({ courseId, progressPct }: { courseId: number; progressPct: number }) =>
      apiClient.patch<CourseEnrollment>(`/hr/courses/${courseId}/progress`, { progressPct }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["streamlineos", "hr", "courses"] }),
  });
}
