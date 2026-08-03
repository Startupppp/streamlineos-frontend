"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface HrAnnouncement {
  id: number;
  orgId: string;
  title: string;
  content: string;
  authorId: string;
  targetType: "ALL" | "DEPARTMENT" | "BRANCH" | "ROLE";
  targetIds: string[];
  isPinned: boolean;
  publishAt?: string | null;
  expiresAt?: string | null;
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "EXPIRED";
  readCount: number;
  attachmentUrls: string[];
  createdAt: string;
}

export type CreateHrAnnouncementData = Omit<HrAnnouncement, "id" | "orgId" | "authorId" | "readCount" | "createdAt">;
export type UpdateHrAnnouncementData = Partial<CreateHrAnnouncementData> & { id: number };

export function useHrAnnouncements() {
  return useQuery<HrAnnouncement[]>({
    queryKey: queryKeys.hr.announcements(),
    queryFn: () => apiClient.get<HrAnnouncement[]>("/org/announcements"),
    staleTime: 60_000,
  });
}

export function useAllHrAnnouncements(options?: { enabled?: boolean }) {
  return useQuery<HrAnnouncement[]>({
    queryKey: queryKeys.hr.announcementsAll(),
    queryFn: () => apiClient.get<HrAnnouncement[]>("/org/announcements/all"),
    staleTime: 30_000,
    enabled: options?.enabled,
  });
}

export function useCreateHrAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "announcements", "create"],
    mutationFn: (data: CreateHrAnnouncementData) =>
      apiClient.post<HrAnnouncement>("/org/announcements", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.announcements() }),
  });
}

export function useUpdateHrAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "announcements", "update"],
    mutationFn: ({ id, ...data }: UpdateHrAnnouncementData) =>
      apiClient.patch<HrAnnouncement>(`/org/announcements/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.announcements() }),
  });
}

export function useDeleteHrAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "announcements", "delete"],
    mutationFn: (id: number) => apiClient.delete<void>(`/org/announcements/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.announcements() }),
  });
}

export function useMarkHrAnnouncementRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "announcements", "read"],
    mutationFn: (id: number) => apiClient.post<void>(`/org/announcements/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.announcements() }),
  });
}
