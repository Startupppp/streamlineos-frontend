"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

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

export interface PointsEntry {
  id: number;
  points: number;
  source: "kudos" | "badge" | "manual" | "redemption";
  note?: string;
  createdAt: string;
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

const KEYS = {
  overview: ["hr", "engagement", "overview"] as const,
  moodHistory: ["hr", "engagement", "mood", "history"] as const,
  moodAggregate: ["hr", "engagement", "mood", "aggregate"] as const,
  badges: ["hr", "engagement", "badges"] as const,
  myBadges: ["hr", "engagement", "badges", "my"] as const,
  myPoints: ["hr", "engagement", "points", "my"] as const,
  leaderboard: (top?: number) => ["hr", "engagement", "leaderboard", top] as const,
  polls: ["hr", "engagement", "polls"] as const,
  pollResults: (pollId: number) => ["hr", "engagement", "polls", pollId, "results"] as const,
  communities: ["hr", "engagement", "communities"] as const,
  communityMembers: (id: number) => ["hr", "engagement", "communities", id, "members"] as const,
  campaigns: ["hr", "engagement", "campaigns"] as const,
  eom: ["hr", "engagement", "eom"] as const,
};

export function useEngagementOverview() {
  return useQuery<EngagementOverview>({
    queryKey: KEYS.overview,
    queryFn: () => apiClient.get<EngagementOverview>("/hr/engagement/overview"),
    staleTime: 5 * 60_000,
  });
}

export function useMyMoodHistory() {
  return useQuery<MoodCheckin[]>({
    queryKey: KEYS.moodHistory,
    queryFn: () => apiClient.get<MoodCheckin[]>("/hr/engagement/mood/history"),
    staleTime: 60_000,
  });
}

export function useOrgMoodAggregate() {
  return useQuery<MoodAggregate[]>({
    queryKey: KEYS.moodAggregate,
    queryFn: () => apiClient.get<MoodAggregate[]>("/hr/engagement/mood/aggregate"),
    staleTime: 5 * 60_000,
  });
}

export function useMoodCheckin() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "engagement", "mood", "checkin"],
    mutationFn: (data: { mood: number; note?: string; date?: string }) =>
      apiClient.post<MoodCheckin>("/hr/engagement/mood", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.moodHistory }),
  });
}

export function useEngagementBadges() {
  return useQuery<HrBadge[]>({
    queryKey: KEYS.badges,
    queryFn: () => apiClient.get<HrBadge[]>("/hr/engagement/badges"),
    staleTime: 5 * 60_000,
  });
}

export function useCreateBadge() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "engagement", "badges", "create"],
    mutationFn: (data: { name: string; description: string; icon: string; points?: number }) =>
      apiClient.post<HrBadge>("/hr/engagement/badges", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.badges }),
  });
}

export function useDeleteBadge() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "engagement", "badges", "delete"],
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/hr/engagement/badges/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.badges }),
  });
}

export function useAwardBadge() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "engagement", "badges", "award"],
    mutationFn: ({ badgeId, ...data }: { badgeId: number; userId: string; reason?: string }) =>
      apiClient.post<HrBadgeAward>(`/hr/engagement/badges/${badgeId}/award`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.myBadges });
      qc.invalidateQueries({ queryKey: KEYS.leaderboard() });
    },
  });
}

export function useMyBadges() {
  return useQuery<HrBadgeAward[]>({
    queryKey: KEYS.myBadges,
    queryFn: () => apiClient.get<HrBadgeAward[]>("/hr/engagement/badges/my"),
    staleTime: 2 * 60_000,
  });
}

export function useMyPoints() {
  return useQuery<PointsEntry[]>({
    queryKey: KEYS.myPoints,
    queryFn: () => apiClient.get<PointsEntry[]>("/hr/engagement/points/my"),
    staleTime: 2 * 60_000,
  });
}

export function useLeaderboard(top = 20) {
  return useQuery<LeaderboardEntry[]>({
    queryKey: KEYS.leaderboard(top),
    queryFn: () => apiClient.get<LeaderboardEntry[]>(`/hr/engagement/points/leaderboard?top=${top}`),
    staleTime: 5 * 60_000,
  });
}

export function useEngagementPolls() {
  return useQuery<HrPoll[]>({
    queryKey: KEYS.polls,
    queryFn: () => apiClient.get<HrPoll[]>("/hr/engagement/polls"),
    staleTime: 60_000,
  });
}

export function useCreatePoll() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "engagement", "polls", "create"],
    mutationFn: (data: { question: string; options: string[]; anonymous?: boolean; closesAt?: string }) =>
      apiClient.post<HrPoll>("/hr/engagement/polls", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.polls }),
  });
}

export function useUpdatePoll() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "engagement", "polls", "update"],
    mutationFn: ({ id, ...data }: { id: number; status?: string; question?: string }) =>
      apiClient.patch<{ success: boolean }>(`/hr/engagement/polls/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.polls }),
  });
}

export function useVotePoll() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "engagement", "polls", "vote"],
    mutationFn: ({ pollId, optionIndex }: { pollId: number; optionIndex: number }) =>
      apiClient.post<{ id: number }>(`/hr/engagement/polls/${pollId}/vote`, { optionIndex }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.polls });
      qc.invalidateQueries({ queryKey: KEYS.pollResults(vars.pollId) });
    },
  });
}

export function usePollResults(pollId: number) {
  return useQuery<PollResults>({
    queryKey: KEYS.pollResults(pollId),
    queryFn: () => apiClient.get<PollResults>(`/hr/engagement/polls/${pollId}/results`),
    staleTime: 30_000,
    enabled: pollId > 0,
  });
}

export function useEngagementCommunities() {
  return useQuery<HrCommunity[]>({
    queryKey: KEYS.communities,
    queryFn: () => apiClient.get<HrCommunity[]>("/hr/engagement/communities"),
    staleTime: 2 * 60_000,
  });
}

export function useCreateCommunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "engagement", "communities", "create"],
    mutationFn: (data: { name: string; description?: string }) =>
      apiClient.post<HrCommunity>("/hr/engagement/communities", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.communities }),
  });
}

export function useJoinCommunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "engagement", "communities", "join"],
    mutationFn: (communityId: number) =>
      apiClient.post<{ success: boolean }>(`/hr/engagement/communities/${communityId}/join`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.communities }),
  });
}

export function useLeaveCommunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "engagement", "communities", "leave"],
    mutationFn: (communityId: number) =>
      apiClient.post<{ success: boolean }>(`/hr/engagement/communities/${communityId}/leave`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.communities }),
  });
}

export function useEngagementCampaigns() {
  return useQuery<HrCampaign[]>({
    queryKey: KEYS.campaigns,
    queryFn: () => apiClient.get<HrCampaign[]>("/hr/engagement/campaigns"),
    staleTime: 2 * 60_000,
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
  return useMutation({
    mutationKey: ["hr", "engagement", "campaigns", "create"],
    mutationFn: (data: CreateCampaignData) =>
      apiClient.post<HrCampaign>("/hr/engagement/campaigns", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.campaigns }),
  });
}

export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "engagement", "campaigns", "update"],
    mutationFn: ({ id, ...data }: Partial<HrCampaign> & { id: number }) =>
      apiClient.patch<HrCampaign>(`/hr/engagement/campaigns/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.campaigns }),
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "engagement", "campaigns", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/engagement/campaigns/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.campaigns }),
  });
}

export function useEmployeeOfMonth() {
  return useQuery<EmployeeOfMonth>({
    queryKey: KEYS.eom,
    queryFn: () => apiClient.get<EmployeeOfMonth>("/hr/engagement/employee-of-month"),
    staleTime: 10 * 60_000,
  });
}
