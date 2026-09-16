"use client";
import type { z } from "zod";
import type { communityBaseContract, listCommunitiesContract, campaignContract } from "@/hooks/api/hr/engagement-schema";
import type { pollContract } from "@/hooks/api/hr/engagement-schema";

import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { hrEngagementQueryKeys } from "@/lib/query-keys/hr-engagement";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";

const noContentC = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { NULL_CURSOR_YET } from "@/hooks/api/cursor-page-param";

export interface MoodCheckin {
  id: number;
  date: string;
  mood: number;
  note?: string;
}

export interface MoodAggregate {
  date: string;
  avgMood: number;
  count: number;
}

export interface HrBadge {
  id: number;
  orgId: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  createdAt: string;
}

export interface HrBadgeAward {
  id: number;
  badgeId: number;
  userId: string;
  awardedBy?: string;
  reason?: string;
  createdAt: string;
  badge: HrBadge;
}

export interface LeaderboardEntry {
  userId: string;
  total: number;
}

export type HrPoll = z.infer<typeof pollContract>;

export interface PollResults {
  pollId: number;
  question: string;
  anonymous: boolean;
  status: string;
  totalVotes: number;
  counts: { option: string; optionIndex: number; count: number }[];
}

export type HrCommunity = z.infer<typeof listCommunitiesContract>["items"][number];

export type HrCampaign = z.infer<typeof campaignContract>;

export interface EmployeeOfMonth {
  period: string;
  top: { userId: string; recognitions: number; points: number; score: number } | null;
}

export interface EngagementOverview {
  employeeOfMonth: EmployeeOfMonth;
  topLeaderboard: LeaderboardEntry[];
}

const _overviewContract = lazyContract(() =>
  import("@/hooks/api/hr/engagement-schema").then((m) => m.engagementOverviewContract),
);
const _moodHistoryContract = lazyContract(() =>
  import("@/hooks/api/hr/engagement-schema").then((m) => m.myMoodHistoryContract),
);
const _moodAggregateContract = lazyContract(() =>
  import("@/hooks/api/hr/engagement-schema").then((m) => m.orgMoodAggregateContract),
);
const _moodCheckinContract = lazyContract(() =>
  import("@/hooks/api/hr/engagement-schema").then((m) => m.moodCheckinContract),
);
const _listBadgesContract = lazyContract(() =>
  import("@/hooks/api/hr/engagement-schema").then((m) => m.listBadgesContract),
);
const _awardBadgeContract = lazyContract(() =>
  import("@/hooks/api/hr/engagement-schema").then((m) => m.awardBadgeContract),
);
const _leaderboardContract = lazyContract(() =>
  import("@/hooks/api/hr/engagement-schema").then((m) => m.leaderboardContract),
);
const _listPollsContract = lazyContract(() =>
  import("@/hooks/api/hr/engagement-schema").then((m) => m.listPollsContract),
);
const _createPollContract = lazyContract(() =>
  import("@/hooks/api/hr/engagement-schema").then((m) => m.createPollContract),
);
const _successContract = lazyContract(() =>
  import("@/hooks/api/hr/engagement-schema").then((m) => m.successContract),
);
const _voteIdContract = lazyContract(() =>
  import("@/hooks/api/hr/engagement-schema").then((m) => m.voteIdContract),
);
const _pollResultsContract = lazyContract(() =>
  import("@/hooks/api/hr/engagement-schema").then((m) => m.pollResultsContract),
);
const _listCommunitiesContract = lazyContract(() =>
  import("@/hooks/api/hr/engagement-schema").then((m) => m.listCommunitiesContract),
);
const _createCommunityContract = lazyContract(() =>
  import("@/hooks/api/hr/engagement-schema").then((m) => m.createCommunityContract),
);
const _listCampaignsContract = lazyContract(() =>
  import("@/hooks/api/hr/engagement-schema").then((m) => m.listCampaignsContract),
);
const _createCampaignContract = lazyContract(() =>
  import("@/hooks/api/hr/engagement-schema").then((m) => m.createCampaignContract),
);
const _updateCampaignContract = lazyContract(() =>
  import("@/hooks/api/hr/engagement-schema").then((m) => m.updateCampaignContract),
);
export function useEngagementOverview() {
  const canView = useCan("hr:engagement:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery<EngagementOverview>({
    queryKey: hrEngagementQueryKeys.hrEngagementHub.overview(),
    queryFn: ({ signal }) => apiClient.get("/hr/engagement/overview", undefined, signal, _overviewContract),
    staleTime: 5 * 60_000,
    enabled: canView && hrEnabled,
  });
}

export function useMyMoodHistory() {
  const canView = useCan("hr:engagement:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: hrEngagementQueryKeys.hrEngagementHub.moodHistory(),
    queryFn: ({ signal }) => apiClient.get("/hr/engagement/mood/history", undefined, signal, _moodHistoryContract),
    staleTime: 60_000,
    enabled: canView && hrEnabled,
  });
}

export function useOrgMoodAggregate() {
  const canManage = useCan("hr:engagement:manage");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery<MoodAggregate[]>({
    queryKey: hrEngagementQueryKeys.hrEngagementHub.moodAggregate(),
    queryFn: ({ signal }) => apiClient.get("/hr/engagement/mood/aggregate", undefined, signal, _moodAggregateContract),
    staleTime: 5 * 60_000,
    enabled: canManage && hrEnabled,
  });
}

export function useMoodCheckin() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:engagement:view", {
    mutationKey: ["hr", "engagement", "mood", "checkin"],
    mutationFn: (data: { mood: number; note?: string; date?: string }) =>
      apiClient.post("/hr/engagement/mood", data, undefined, _moodCheckinContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: hrEngagementQueryKeys.hrEngagementHub.moodHistory() }),
  });
}

export function useEngagementBadges() {
  const canView = useCan("hr:engagement:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery<HrBadge[]>({
    queryKey: hrEngagementQueryKeys.hrEngagementHub.badges(),
    queryFn: ({ signal }) => apiClient.get("/hr/engagement/badges", undefined, signal, _listBadgesContract),
    staleTime: 5 * 60_000,
    enabled: canView && hrEnabled,
  });
}

export function useAwardBadge() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:engagement:manage", {
    mutationKey: ["hr", "engagement", "badges", "award"],
    mutationFn: ({ badgeId, ...data }: { badgeId: number; userId: string; reason?: string }) =>
      apiClient.post(`/hr/engagement/badges/${badgeId}/award`, data, undefined, _awardBadgeContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hrEngagementQueryKeys.hrEngagementHub.myBadges() });
      qc.invalidateQueries({ queryKey: hrEngagementQueryKeys.hrEngagementHub.leaderboard() });
    },
  });
}

export function useLeaderboard(top = 20) {
  const canView = useCan("hr:engagement:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery<LeaderboardEntry[]>({
    queryKey: hrEngagementQueryKeys.hrEngagementHub.leaderboard(top),
    queryFn: ({ signal }) => apiClient.get(`/hr/engagement/points/leaderboard?top=${top}`, undefined, signal, _leaderboardContract),
    staleTime: 5 * 60_000,
    enabled: canView && hrEnabled,
  });
}

export function useEngagementPolls() {
  const canView = useCan("hr:engagement:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: hrEngagementQueryKeys.hrEngagementHub.polls(),
    queryFn: ({ signal }) => apiClient.get("/hr/engagement/polls", undefined, signal, _listPollsContract),
    staleTime: 60_000,
    enabled: canView && hrEnabled,
  });
}

export function useCreatePoll() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:engagement:manage", {
    mutationKey: ["hr", "engagement", "polls", "create"],
    mutationFn: (data: { question: string; options: string[]; anonymous?: boolean; closesAt?: string }) =>
      apiClient.post("/hr/engagement/polls", data, undefined, _createPollContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: hrEngagementQueryKeys.hrEngagementHub.polls() }),
  });
}

export function useUpdatePoll() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:engagement:manage", {
    mutationKey: ["hr", "engagement", "polls", "update"],
    mutationFn: ({ pollId, ...data }: { pollId: number; status?: string; question?: string }) =>
      apiClient.patch(`/hr/engagement/polls/${pollId}`, data, undefined, _successContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: hrEngagementQueryKeys.hrEngagementHub.polls() }),
  });
}

export function useVotePoll() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:engagement:view", {
    mutationKey: ["hr", "engagement", "polls", "vote"],
    mutationFn: ({ pollId, optionIndex }: { pollId: number; optionIndex: number }) =>
      apiClient.post(`/hr/engagement/polls/${pollId}/vote`, { optionIndex }, undefined, _voteIdContract),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: hrEngagementQueryKeys.hrEngagementHub.polls() });
      qc.invalidateQueries({ queryKey: hrEngagementQueryKeys.hrEngagementHub.pollResults(vars.pollId) });
    },
  });
}

export function usePollResults(pollId: number) {
  const canView = useCan("hr:engagement:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery<PollResults>({
    queryKey: hrEngagementQueryKeys.hrEngagementHub.pollResults(pollId),
    queryFn: ({ signal }) => apiClient.get(`/hr/engagement/polls/${pollId}/results`, undefined, signal, _pollResultsContract),
    staleTime: 30_000,
    enabled: pollId > 0 && canView && hrEnabled,
  });
}

interface CommunityPage {
  items: HrCommunity[];
  nextCursor: string | null;
}

export function useEngagementCommunities() {
  const canView = useCan("hr:engagement:view");
  const hrEnabled = useModuleEnabled("hr");
  return useInfiniteQuery({
    queryKey: hrEngagementQueryKeys.hrEngagementHub.communities(),
    initialPageParam: NULL_CURSOR_YET,
    queryFn: ({ pageParam, signal }) => {
      const params = new URLSearchParams({ limit: "30" });
      if (pageParam !== null) params.set("cursor", pageParam);
      return apiClient.get(`/hr/engagement/communities?${params}`, undefined, signal, _listCommunitiesContract);
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 2 * 60_000,
    enabled: canView && hrEnabled,
  });
}

export function useCreateCommunity() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:engagement:view", {
    mutationKey: ["hr", "engagement", "communities", "create"],
    mutationFn: (data: { name: string; description?: string }) =>
      apiClient.post("/hr/engagement/communities", data, undefined, _createCommunityContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: hrEngagementQueryKeys.hrEngagementHub.communities() }),
  });
}

export function useJoinCommunity() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:engagement:view", {
    mutationKey: ["hr", "engagement", "communities", "join"],
    mutationFn: (communityId: number) =>
      apiClient.post(`/hr/engagement/communities/${communityId}/join`, {}, undefined, _successContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: hrEngagementQueryKeys.hrEngagementHub.communities() }),
  });
}

export function useLeaveCommunity() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:engagement:view", {
    mutationKey: ["hr", "engagement", "communities", "leave"],
    mutationFn: (communityId: number) =>
      apiClient.post(`/hr/engagement/communities/${communityId}/leave`, {}, undefined, _successContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: hrEngagementQueryKeys.hrEngagementHub.communities() }),
  });
}

export function useEngagementCampaigns() {
  const canView = useCan("hr:engagement:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: hrEngagementQueryKeys.hrEngagementHub.campaigns(),
    queryFn: ({ signal }) => apiClient.get("/hr/engagement/campaigns", undefined, signal, _listCampaignsContract),
    staleTime: 2 * 60_000,
    enabled: canView && hrEnabled,
  });
}

export interface CreateCampaignData {
  name: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  status?: HrCampaign["status"];
  audience?: HrCampaign["audience"];
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:engagement:manage", {
    mutationKey: ["hr", "engagement", "campaigns", "create"],
    mutationFn: (data: CreateCampaignData) =>
      apiClient.post("/hr/engagement/campaigns", data, undefined, _createCampaignContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: hrEngagementQueryKeys.hrEngagementHub.campaigns() }),
  });
}

export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:engagement:manage", {
    mutationKey: ["hr", "engagement", "campaigns", "update"],
    mutationFn: ({ campaignId, ...data }: Partial<HrCampaign> & { campaignId: number }) =>
      apiClient.patch(`/hr/engagement/campaigns/${campaignId}`, data, undefined, _updateCampaignContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: hrEngagementQueryKeys.hrEngagementHub.campaigns() }),
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:engagement:manage", {
    mutationKey: ["hr", "engagement", "campaigns", "delete"],
    mutationFn: (campaignId: number) =>
      apiClient.delete<void>(`/hr/engagement/campaigns/${campaignId}`, undefined, undefined, noContentC),
    onSuccess: () => qc.invalidateQueries({ queryKey: hrEngagementQueryKeys.hrEngagementHub.campaigns() }),
  });
}
