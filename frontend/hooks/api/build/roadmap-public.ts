"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, isApiError } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import type { PublicRoadmapItem, PublicFeedbackPost, PublicChangelogEntry } from "@/types/projects";

const publicRoadmapBoardContract = lazyContract(() =>
  import("@/hooks/api/build/roadmap-schema").then((m) => m.publicRoadmapBoardContract),
);
const publicVoteResultContract = lazyContract(() =>
  import("@/hooks/api/build/roadmap-schema").then((m) => m.publicVoteResultContract),
);
const publicFeedbackResultContract = lazyContract(() =>
  import("@/hooks/api/build/roadmap-schema").then((m) => m.publicFeedbackResultContract),
);
const roadmapPublicationLazy = lazyContract(() =>
  import("@/hooks/api/build/roadmap-schema").then((m) => m.roadmapPublicationContract),
);

export interface RoadmapPublication {
  token: string | null;
  path: string | null;
}

interface PublicRoadmapBoard {
  orgName: string | null;
  roadmap: {
    planned: PublicRoadmapItem[];
    in_progress: PublicRoadmapItem[];
    completed: PublicRoadmapItem[];
  };
  feedback: PublicFeedbackPost[];
  changelog: PublicChangelogEntry[];
}

interface PublicVoteInput {
  type: "roadmap" | "feedback";
  id: number;
  voterKey: string;
}

interface PublicVoteResult {
  id: number;
  type: string;
  votes: number;
  voted: boolean;
}

interface SubmitPublicFeedbackInput {
  title: string;
  description?: string;
  name?: string;
  email?: string;
}

export function usePublicRoadmap(orgId: string) {
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.roadmap.publicBoard(orgId),
    queryFn: ({ signal }) =>
      apiClient.get<PublicRoadmapBoard>(
        "/public/roadmap",
        { org: orgId },
        signal,
        publicRoadmapBoardContract,
      ),
    enabled: Boolean(orgId),
    staleTime: 60_000,
    retry: false,
  });
}

export function usePublicVote(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "roadmap", "vote"],
    mutationFn: (input: PublicVoteInput) =>
      apiClient.post<PublicVoteResult>(
        `/public/roadmap/vote?org=${encodeURIComponent(orgId)}`,
        input,
        undefined,
        publicVoteResultContract,
      ),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.roadmap.publicBoard(orgId),
      }),
  });
}

export function useSubmitPublicFeedback(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "feedback", "submit"],
    mutationFn: (input: SubmitPublicFeedbackInput) =>
      apiClient.post<{ id: number; message: string }>(
        `/public/roadmap/feedback?org=${encodeURIComponent(orgId)}`,
        input,
        undefined,
        publicFeedbackResultContract,
      ),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.roadmap.publicBoard(orgId),
      }),
  });
}

export function useRoadmapPublication() {
  const canView = useCan("build:roadmap:view");
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.roadmap.publication,
    queryFn: async ({ signal }) => {
      try {
        return await apiClient.get<RoadmapPublication>(
          "/build/roadmap-publication",
          undefined,
          signal,
          roadmapPublicationLazy,
        );
      } catch (error) {
        if (isApiError(error) && error.status === 400) return null;
        throw error;
      }
    },
    enabled: canView,
    staleTime: 5 * 60_000,
  });
}

export function usePublishRoadmap() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:roadmap:manage", {
    mutationKey: ["projects", "roadmap", "publication", "publish"],
    mutationFn: () =>
      apiClient.post<RoadmapPublication>(
        "/build/roadmap-publication",
        {},
        undefined,
        roadmapPublicationLazy,
      ),
    onSuccess: (publication) =>
      qc.setQueryData(
        knowledgeAndSurveysQueryKeys.roadmap.publication,
        publication,
      ),
  });
}
