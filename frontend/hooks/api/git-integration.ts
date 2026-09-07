"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";

const gitConnectionListContract = lazyContract(() =>
  import("@/hooks/api/git-integration-schema").then((m) => m.gitConnectionListContract),
);
const gitConnectionCreateContract = lazyContract(() =>
  import("@/hooks/api/git-integration-schema").then((m) => m.gitConnectionCreateContract),
);
const gitConnectionUpdateContract = lazyContract(() =>
  import("@/hooks/api/git-integration-schema").then((m) => m.gitConnectionUpdateContract),
);
const gitConnectionDeleteContract = lazyContract(() =>
  import("@/hooks/api/git-integration-schema").then((m) => m.gitConnectionDeleteContract),
);
const ticketGitLinksContract = lazyContract(() =>
  import("@/hooks/api/git-integration-schema").then((m) => m.ticketGitLinksContract),
);


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
  // The three mutations below gate on `integrations:git:manage`, matching the controller. This
  // read gated on `settings:manage`, which the route has never required — the backend declares
  // `integrations:git:view` on both the canonical `GET /integrations/git/connections` and the
  // `/settings/integrations/git` alias. A user holding the git-integration grants but not
  // `settings:manage` could therefore create, edit and delete connections while the list itself
  // stayed empty.
  return useGatedQuery("integrations:git:view", {
    queryKey: accountingAndSupportQueryKeys.gitIntegration.connections(),
    queryFn: ({ signal }) => apiClient.get<GitConnection[]>("/settings/integrations/git", undefined, signal, gitConnectionListContract),
    staleTime: 60_000,
  });
}

export function useCreateGitConnection() {
  const qc = useQueryClient();
  return useAuthorizedMutation("integrations:git:manage", {
    mutationKey: ["create", "git", "connection"],
    mutationFn: (input: CreateGitConnectionInput) =>
      apiClient.post<CreatedGitConnection>("/settings/integrations/git", input, undefined, gitConnectionCreateContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.gitIntegration.connections() }),
  });
}

export function useUpdateGitConnection() {
  const qc = useQueryClient();
  return useAuthorizedMutation("integrations:git:manage", {
    mutationKey: ["update", "git", "connection"],
    mutationFn: ({ id, ...input }: UpdateGitConnectionInput) =>
      apiClient.patch<GitConnection>(`/settings/integrations/git/${id}`, input, undefined, gitConnectionUpdateContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.gitIntegration.connections() }),
  });
}

export function useDeleteGitConnection() {
  const qc = useQueryClient();
  return useAuthorizedMutation("integrations:git:manage", {
    mutationKey: ["delete", "git", "connection"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/settings/integrations/git/${id}`, undefined, undefined, gitConnectionDeleteContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.gitIntegration.connections() }),
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
  return useGatedQuery("build:tickets:view", {
    queryKey: accountingAndSupportQueryKeys.gitIntegration.ticketLinks(ticketId),
    queryFn: ({ signal }) =>
      apiClient.get<TicketGitLink[]>(
        `/build/${projectId}/tickets/${ticketId}/git-links`, undefined, signal, ticketGitLinksContract,
      ),
    enabled: !!projectId && !!ticketId,
    staleTime: 30_000,
  });
}

