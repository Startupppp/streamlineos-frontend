"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import type {
  AnnouncementStatus,
  AnnouncementTargetType,
} from "@/hooks/api/hr/announcements-schema";

const announcementListC = lazyContract(() =>
  import("@/hooks/api/hr/announcements-schema").then((m) => m.announcementListContract),
);
const announcementC = lazyContract(() =>
  import("@/hooks/api/hr/announcements-schema").then((m) => m.announcementContract),
);
const announcementSuccessC = lazyContract(() =>
  import("@/hooks/api/hr/announcements-schema").then((m) => m.announcementSuccessContract),
);

export interface HrAnnouncement {
  id: number;
  orgId: string;
  title: string;
  content: string;
  authorId: string;
  targetType: AnnouncementTargetType;
  targetIds: string[];
  isPinned: boolean;
  publishAt?: string | null;
  expiresAt?: string | null;
  status: AnnouncementStatus;
  readCount: number;
  attachmentUrls: string[];
  createdAt: string;
}

export type CreateHrAnnouncementData = Omit<HrAnnouncement, "id" | "orgId" | "authorId" | "readCount" | "createdAt">;
export type UpdateHrAnnouncementData = Partial<CreateHrAnnouncementData> & { id: number };

export function useHrAnnouncements() {
  return useQuery<HrAnnouncement[]>({
    queryKey: humanResourcesQueryKeys.hr.announcements(),
    queryFn: ({ signal }) => apiClient.get<HrAnnouncement[]>("/org/announcements", undefined, signal, announcementListC),
    staleTime: 60_000,
  });
}

export function useAllHrAnnouncements(options?: { enabled?: boolean }) {
  return useGatedQuery<HrAnnouncement[]>("hr:announcements:manage", {
    queryKey: humanResourcesQueryKeys.hr.announcementsAll(),
    queryFn: ({ signal }) => apiClient.get<HrAnnouncement[]>("/org/announcements/all", undefined, signal, announcementListC),
    staleTime: 30_000,
    enabled: options?.enabled,
  });
}

export function useCreateHrAnnouncement() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:announcements:manage", {
    mutationKey: ["hr", "announcements", "create"],
    mutationFn: (data: CreateHrAnnouncementData) =>
      apiClient.post<HrAnnouncement>("/org/announcements", data, undefined, announcementC),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.announcements() }),
  });
}

export function useUpdateHrAnnouncement() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:announcements:manage", {
    mutationKey: ["hr", "announcements", "update"],
    mutationFn: ({ id, ...data }: UpdateHrAnnouncementData) =>
      apiClient.patch<HrAnnouncement>(`/org/announcements/${id}`, data, undefined, announcementC),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.announcements() }),
  });
}

export function useDeleteHrAnnouncement() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:announcements:manage", {
    mutationKey: ["hr", "announcements", "delete"],
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/org/announcements/${id}`, undefined, undefined, announcementSuccessC),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.announcements() }),
  });
}

export function useMarkHrAnnouncementRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "announcements", "read"],
    mutationFn: (id: number) => apiClient.post<{ success: boolean }>(`/org/announcements/${id}/read`, undefined, undefined, announcementSuccessC),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.announcements() }),
  });
}
