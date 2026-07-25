"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";

export interface KbSource {
  id: number;
  kind: "file" | "note";
  title: string;
  mimeType: string | null;
  fileSize: number | null;
  fileUrl: string | null;
  status: "processing" | "ready" | "failed";
  chunkCount: number;
  errorMessage: string | null;
  spaceId: number | null;
  createdAt: string;
}

export function useKbSources() {
  const canView = useCan("kb:pages:view");
  return useQuery({
    queryKey: ["kb", "sources"],
    queryFn: () => apiClient.get<KbSource[]>("/kb/sources"),
    staleTime: 15_000,
    enabled: canView,
    refetchInterval: (query) =>
      query.state.data?.some((s) => s.status === "processing") ? 3000 : false,
  });
}

export function useUploadKbSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["kb", "sources", "upload"],
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return apiClient.upload<KbSource>("/kb/sources", fd);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kb", "sources"] }),
  });
}

export function useCreateKbSourceNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; text: string }) =>
      apiClient.post<KbSource>("/kb/sources/note", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kb", "sources"] }),
  });
}

export function useDeleteKbSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/kb/sources/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kb", "sources"] }),
  });
}
