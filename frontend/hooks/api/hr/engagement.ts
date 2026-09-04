"use client";

import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiClient } from "@/lib/api-client";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

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

export interface HrPoll {
  id: number;
  orgId: string;
  question: string;
  options: string[];
  status: "draft" | "active" | "closed";
  anonymous: boolean;
  closesAt?: string;
  createdAt: string;
}

export interface PollResults {
  pollId: number;
  question: string;
  anonymous: boolean;
  status: string;
  totalVotes: number;
  counts: { option: string; optionIndex: number; count: number }[];
}

export interface HrCommunity {
  id: number;
  orgId: string;
  name: string;
  description?: string;
  createdAt: string;
  members: { userId: string; role: "member" | "moderator" }[];
}

export interface HrCampaign {
  id: number;
  orgId: string;
  name: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  status: "draft" | "active" | "completed" | "cancelled";
  audience?: { type: string; ids?: string[] };
  createdAt: string;
}

export interface EmployeeOfMonth {
  period: string;
  top: { userId: string; recognitions: number; points: number; score: number } | null;
}

export interface EngagementOverview {
  employeeOfMonth: EmployeeOfMonth;
  topLeaderboard: LeaderboardEntry[];
}

export function useEngagementOverview() {
  const canView = useCan("hr:engagement:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery<EngagementOverview>({
    queryKey: queryKeys.hrEngagementHub.overview(),
    queryFn: ({ signal }) => apiClient.get<EngagementOverview>("/hr/engagement/overview", undefined, signal),
    staleTime: 5 * 60_000,
    enabled: canView && hrEnabled,
  });
}

export function useMyMoodHistory() {
  const canView = useCan("hr:engagement:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery<MoodCheckin[]>({
    queryKey: queryKeys.hrEngagementHub.moodHistory(),
    queryFn: ({ signal }) => apiClient.get<MoodCheckin[]>("/hr/engagement/mood/history", undefined, signal),
    staleTime: 60_000,
    enabled: canView && hrEnabled,
  });
}

export function useOrgMoodAggregate() {
  const canManage = useCan("hr:engagement:manage");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery<MoodAggregate[]>({
    queryKey: queryKeys.hrEngagementHub.moodAggregate(),
    queryFn: ({ signal }) => apiClient.get<MoodAggregate[]>("/hr/engagement/mood/aggregate", undefined, signal),
    staleTime: 5 * 60_000,
    enabled: canManage && hrEnabled,
  });
}

export function useMoodCheckin() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:engagement:view", {
    mutationKey: ["hr", "engagement", "mood", "checkin"],
    mutationFn: (data: { mood: number; note?: string; date?: string }) =>
      apiClient.post<MoodCheckin>("/hr/engagement/mood", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hrEngagementHub.moodHistory() }),
  });
}

export function useEngagementBadges() {
  const canView = useCan("hr:engagement:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery<HrBadge[]>({
    queryKey: queryKeys.hrEngagementHub.badges(),
    queryFn: ({ signal }) => apiClient.get<HrBadge[]>("/hr/engagement/badges", undefined, signal),
    staleTime: 5 * 60_000,
    enabled: canView && hrEnabled,
  });
}

export function useAwardBadge() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:engagement:manage", {
    mutationKey: ["hr", "engagement", "badges", "award"],
    mutationFn: ({ badgeId, ...data }: { badgeId: number; userId: string; reason?: string }) =>
      apiClient.post<HrBadgeAward>(`/hr/engagement/badges/${badgeId}/award`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hrEngagementHub.myBadges() });
      qc.invalidateQueries({ queryKey: queryKeys.hrEngagementHub.leaderboard() });
    },
  });
}

export function useLeaderboard(top = 20) {
  const canView = useCan("hr:engagement:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery<LeaderboardEntry[]>({
    queryKey: queryKeys.hrEngagementHub.leaderboard(top),
    queryFn: ({ signal }) => apiClient.get<LeaderboardEntry[]>(`/hr/engagement/points/leaderboard?top=${top}`, undefined, signal),
    staleTime: 5 * 60_000,
    enabled: canView && hrEnabled,
  });
}

export function useEngagementPolls() {
  const canView = useCan("hr:engagement:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery<HrPoll[]>({
    queryKey: queryKeys.hrEngagementHub.polls(),
    queryFn: ({ signal }) => apiClient.get<HrPoll[]>("/hr/engagement/polls", undefined, signal),
    staleTime: 60_000,
    enabled: canView && hrEnabled,
  });
}

export function useCreatePoll() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:engagement:manage", {
    mutationKey: ["hr", "engagement", "polls", "create"],
    mutationFn: (data: { question: string; options: string[]; anonymous?: boolean; closesAt?: string }) =>
      apiClient.post<HrPoll>("/hr/engagement/polls", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hrEngagementHub.polls() }),
  });
}

export function useUpdatePoll() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:engagement:manage", {
    mutationKey: ["hr", "engagement", "polls", "update"],
    mutationFn: ({ id, ...data }: { id: number; status?: string; question?: string }) =>
      apiClient.patch<{ success: boolean }>(`/hr/engagement/polls/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hrEngagementHub.polls() }),
  });
}

export function useVotePoll() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:engagement:view", {
    mutationKey: ["hr", "engagement", "polls", "vote"],
    mutationFn: ({ pollId, optionIndex }: { pollId: number; optionIndex: number }) =>
      apiClient.post<{ id: number }>(`/hr/engagement/polls/${pollId}/vote`, { optionIndex }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.hrEngagementHub.polls() });
      qc.invalidateQueries({ queryKey: queryKeys.hrEngagementHub.pollResults(vars.pollId) });
    },
  });
}

export function usePollResults(pollId: number) {
  const canView = useCan("hr:engagement:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery<PollResults>({
    queryKey: queryKeys.hrEngagementHub.pollResults(pollId),
    queryFn: ({ signal }) => apiClient.get<PollResults>(`/hr/engagement/polls/${pollId}/results`, undefined, signal),
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
    queryKey: queryKeys.hrEngagementHub.communities(),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam , signal }) => {
      const params = new URLSearchParams({ limit: "30" });
      if (pageParam !== null) params.set("cursor", pageParam);
      return apiClient.get<CommunityPage>(`/hr/engagement/communities?${params}`, undefined, signal);
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
      apiClient.post<HrCommunity>("/hr/engagement/communities", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hrEngagementHub.communities() }),
  });
}

export function useJoinCommunity() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:engagement:view", {
    mutationKey: ["hr", "engagement", "communities", "join"],
    mutationFn: (communityId: number) =>
      apiClient.post<{ success: boolean }>(`/hr/engagement/communities/${communityId}/join`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hrEngagementHub.communities() }),
  });
}

export function useLeaveCommunity() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:engagement:view", {
    mutationKey: ["hr", "engagement", "communities", "leave"],
    mutationFn: (communityId: number) =>
      apiClient.post<{ success: boolean }>(`/hr/engagement/communities/${communityId}/leave`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hrEngagementHub.communities() }),
  });
}

export function useEngagementCampaigns() {
  const canView = useCan("hr:engagement:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery<HrCampaign[]>({
    queryKey: queryKeys.hrEngagementHub.campaigns(),
    queryFn: ({ signal }) => apiClient.get<HrCampaign[]>("/hr/engagement/campaigns", undefined, signal),
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
      apiClient.post<HrCampaign>("/hr/engagement/campaigns", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hrEngagementHub.campaigns() }),
  });
}

export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:engagement:manage", {
    mutationKey: ["hr", "engagement", "campaigns", "update"],
    mutationFn: ({ id, ...data }: Partial<HrCampaign> & { id: number }) =>
      apiClient.patch<HrCampaign>(`/hr/engagement/campaigns/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hrEngagementHub.campaigns() }),
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:engagement:manage", {
    mutationKey: ["hr", "engagement", "campaigns", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/engagement/campaigns/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hrEngagementHub.campaigns() }),
  });
}

