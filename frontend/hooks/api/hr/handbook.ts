"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { lazyContract } from "@/lib/api-envelope";

const noContentC = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

const handbookListLazy = lazyContract(() =>
  import("@/hooks/api/hr/handbook-schema").then((m) => m.handbookListContract),
);
const handbookRowLazy = lazyContract(() =>
  import("@/hooks/api/hr/handbook-schema").then((m) => m.handbookRowContract),
);
const handbookSuccessLazy = lazyContract(() =>
  import("@/hooks/api/hr/handbook-schema").then((m) => m.handbookMutationSuccessContract),
);

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
  handbookId: number;
  status?: "PUBLISHED" | "DRAFT";
  title?: string;
  version?: string;
  documentUrl?: string;
  changelog?: string;
}

const handbookKeys = {
  all: [...humanResourcesQueryKeys.hr.all, "handbook"] as const,
  list: () => [...handbookKeys.all, "list"] as const,
};

export function useHandbookVersions() {
  return useGatedQuery("hr:employees:view", {
    queryKey: handbookKeys.list(),
    queryFn: ({ signal }) => apiClient.get<HandbookVersion[]>("/hr/handbook", undefined, signal, handbookListLazy),
    staleTime: 2 * 60_000,
  });
}

export function useCreateHandbookVersion() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:handbook:manage", {
    mutationKey: ["hr", "handbook", "create"],
    mutationFn: (data: CreateHandbookVersionInput) =>
      apiClient.post<HandbookVersion>("/hr/handbook", data, undefined, handbookRowLazy),
    onSuccess: () => qc.invalidateQueries({ queryKey: handbookKeys.list() }),
  });
}

export function useUpdateHandbookVersion() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:handbook:manage", {
    mutationKey: ["hr", "handbook", "update"],
    mutationFn: ({ handbookId, ...data }: UpdateHandbookVersionInput) =>
      apiClient.patch<{ success: boolean }>(`/hr/handbook/${handbookId}`, data, undefined, handbookSuccessLazy),
    onSuccess: () => qc.invalidateQueries({ queryKey: handbookKeys.list() }),
  });
}

export function useDeleteHandbookVersion() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:handbook:manage", {
    mutationKey: ["hr", "handbook", "delete"],
    mutationFn: (handbookId: number) =>
      apiClient.delete<void>(`/hr/handbook/${handbookId}`, undefined, undefined, noContentC),
    onSuccess: () => qc.invalidateQueries({ queryKey: handbookKeys.list() }),
  });
}
