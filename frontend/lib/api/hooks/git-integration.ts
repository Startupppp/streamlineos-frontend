"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type GitProvider = "github" | "gitlab" | "bitbucket";
export type GitRefType = "commit" | "pull_request" | "branch";

export interface GitConnection {
  id: number;
  provider: GitProvider;
  repoUrl: string;
  repoName: string | null;
  isActive: boolean;
  maskedSecret: string;
  webhookUrl: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreatedGitConnection {
  id: number;
  provider: GitProvider;
  repoUrl: string;
  repoName: string | null;
  isActive: boolean;
  webhookUrl: string;
  webhookSecret: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateGitConnectionInput {
  provider: GitProvider;
  repoUrl: string;
  repoName?: string;
}

export interface UpdateGitConnectionInput {
  id: number;
  isActive?: boolean;
  repoUrl?: string;
  repoName?: string | null;
}

export interface TicketGitLink {
  id: number;
  provider: GitProvider;
  refType: GitRefType;
  externalId: string;
  title: string | null;
  url: string | null;
  author: string | null;
  status: string | null;
  createdAt: string | null;
}

export function useGitConnections() {
  return useQuery({
    queryKey: queryKeys.gitIntegration.connections(),
    queryFn: () => apiClient.get<GitConnection[]>("/settings/integrations/git"),
    staleTime: 60_000,
  });
}

export function useCreateGitConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGitConnectionInput) =>
      apiClient.post<CreatedGitConnection>("/settings/integrations/git", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.gitIntegration.connections() }),
  });
}

export function useUpdateGitConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateGitConnectionInput) =>
      apiClient.patch<GitConnection>(`/settings/integrations/git/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.gitIntegration.connections() }),
  });
}

export function useDeleteGitConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/settings/integrations/git/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.gitIntegration.connections() }),
  });
}

export function useTicketGitLinks(ticketId: number, projectId: number) {
  return useQuery({
    queryKey: queryKeys.gitIntegration.ticketLinks(ticketId),
    queryFn: () =>
      apiClient.get<TicketGitLink[]>(`/projects/${projectId}/tickets/${ticketId}/git-links`),
    enabled: !!ticketId && !!projectId,
    staleTime: 30_000,
  });
}
