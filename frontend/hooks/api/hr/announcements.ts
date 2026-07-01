"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface Announcement {
  id: number;
  orgId: string;
  title: string;
  content: string;
  authorId: string;
  targetType: "ALL" | "DEPARTMENT" | "BRANCH" | "ROLE";
  targetIds: string[];
  isPinned: boolean;
  publishAt?: string;
  expiresAt?: string;
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "EXPIRED";
  readCount: number;
  attachmentUrls: string[];
  createdAt: string;
}

export type CreateAnnouncementData = Omit<Announcement, "id" | "orgId" | "authorId" | "readCount" | "createdAt">;
export type UpdateAnnouncementData = Partial<CreateAnnouncementData> & { id: number };

export function useAnnouncements() {
  return useQuery<Announcement[]>({
    queryKey: ["hr", "announcements"],
    queryFn: () => apiClient.get<Announcement[]>("/hr/announcements"),
    staleTime: 60_000,
  });
}

export function useAllAnnouncements() {
  return useQuery<Announcement[]>({
    queryKey: ["hr", "announcements", "all"],
    queryFn: () => apiClient.get<Announcement[]>("/hr/announcements/all"),
    staleTime: 30_000,
  });
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "announcements", "create"],
    mutationFn: (data: CreateAnnouncementData) =>
      apiClient.post<Announcement>("/hr/announcements", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "announcements"] }),
  });
}

export function useUpdateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "announcements", "update"],
    mutationFn: ({ id, ...data }: UpdateAnnouncementData) =>
      apiClient.patch<Announcement>(`/hr/announcements/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "announcements"] }),
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "announcements", "delete"],
    mutationFn: (id: number) => apiClient.delete<void>(`/hr/announcements/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "announcements"] }),
  });
}

export function useMarkAnnouncementRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "announcements", "read"],
    mutationFn: (id: number) => apiClient.post<void>(`/hr/announcements/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "announcements"] }),
  });
}
