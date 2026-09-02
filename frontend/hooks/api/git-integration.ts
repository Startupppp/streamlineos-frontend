"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export type GitProvider = "github" | "gitlab" | "bitbucket";

export interface GitConnection {
  id: number;
  provider: GitProvider;
  projectId: number | null;
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
  projectId: number | null;
  repoUrl: string;
  repoName: string | null;
  isActive: boolean;
  webhookUrl: string;
  webhookSecret: string;
  createdAt: string | null;
  updatedAt: string | null;
}

interface CreateGitConnectionInput {
  provider: GitProvider;
  repoUrl: string;
  repoName?: string;
  projectId?: number | null;
}

interface UpdateGitConnectionInput {
  id: number;
  isActive?: boolean;
  repoUrl?: string;
  repoName?: string | null;
  projectId?: number | null;
}

export function useGitConnections() {
  return useQuery({
    queryKey: queryKeys.gitIntegration.connections(),
    queryFn: ({ signal }) => apiClient.get<GitConnection[]>("/settings/integrations/git", undefined, signal),
    staleTime: 60_000,
  });
}

export function useCreateGitConnection() {
  const qc = useQueryClient();
  return useAuthorizedMutation("settings:manage", {
    mutationKey: ["create", "git", "connection"],
    mutationFn: (input: CreateGitConnectionInput) =>
      apiClient.post<CreatedGitConnection>("/settings/integrations/git", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.gitIntegration.connections() }),
  });
}

export function useUpdateGitConnection() {
  const qc = useQueryClient();
  return useAuthorizedMutation("settings:manage", {
    mutationKey: ["update", "git", "connection"],
    mutationFn: ({ id, ...input }: UpdateGitConnectionInput) =>
      apiClient.patch<GitConnection>(`/settings/integrations/git/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.gitIntegration.connections() }),
  });
}

export function useDeleteGitConnection() {
  const qc = useQueryClient();
  return useAuthorizedMutation("settings:manage", {
    mutationKey: ["delete", "git", "connection"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/settings/integrations/git/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.gitIntegration.connections() }),
  });
}

export type GitRefType = "commit" | "pull_request" | "branch";

export interface TicketGitLink {
  id: number;
  provider: GitProvider;
  refType: GitRefType;
  externalId: string;
  title: string | null;
  url: string | null;
  author: string | null;
  status: string | null;
  createdAt: string;
}

export function useTicketGitLinks(projectId: number, ticketId: number) {
  return useQuery({
    queryKey: queryKeys.gitIntegration.ticketLinks(ticketId),
    queryFn: ({ signal }) =>
      apiClient.get<TicketGitLink[]>(
        `/build/${projectId}/tickets/${ticketId}/git-links`, undefined, signal,
      ),
    enabled: !!projectId && !!ticketId,
    staleTime: 30_000,
  });
}

