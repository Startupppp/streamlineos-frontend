"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface HandbookVersion {
  id: number;
  version: string;
  title: string;
  changelog: string | null;
  documentUrl: string | null;
  publishedAt: string | null;
  publishedBy: string | null;
  createdAt: string;
}

interface CreateHandbookVersionInput {
  version: string;
  title: string;
  changelog?: string;
  documentUrl?: string;
}

interface UpdateHandbookVersionInput {
  id: number;
  status?: "PUBLISHED" | "DRAFT";
  title?: string;
  version?: string;
  documentUrl?: string;
  changelog?: string;
}

const handbookKeys = {
  all: [...queryKeys.hr.all, "handbook"] as const,
  list: () => [...handbookKeys.all, "list"] as const,
};

export function useHandbookVersions() {
  return useQuery({
    queryKey: handbookKeys.list(),
    queryFn: ({ signal }) => apiClient.get<HandbookVersion[]>("/hr/handbook", undefined, signal),
    staleTime: 2 * 60_000,
  });
}

export function useCreateHandbookVersion() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:handbook:manage", {
    mutationKey: ["hr", "handbook", "create"],
    mutationFn: (data: CreateHandbookVersionInput) =>
      apiClient.post<HandbookVersion>("/hr/handbook", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: handbookKeys.list() }),
  });
}

export function useUpdateHandbookVersion() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:handbook:manage", {
    mutationKey: ["hr", "handbook", "update"],
    mutationFn: ({ id, ...data }: UpdateHandbookVersionInput) =>
      apiClient.patch<{ success: boolean }>(`/hr/handbook/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: handbookKeys.list() }),
  });
}

export function useDeleteHandbookVersion() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:handbook:manage", {
    mutationKey: ["hr", "handbook", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/handbook/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: handbookKeys.list() }),
  });
}
