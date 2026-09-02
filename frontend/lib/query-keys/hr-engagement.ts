import { queryKeyBase as base } from "./base";

export const hrEngagementQueryKeys = {
  hrEngagementHub: {
    all: [...base, "hr", "engagement"] as const,
    overview: () => [...base, "hr", "engagement", "overview"] as const,
    moodHistory: () => [...base, "hr", "engagement", "mood", "history"] as const,
    moodAggregate: () =>
      [...base, "hr", "engagement", "mood", "aggregate"] as const,
    badges: () => [...base, "hr", "engagement", "badges"] as const,
    myBadges: () => [...base, "hr", "engagement", "badges", "my"] as const,
    leaderboard: (top?: number) =>
      top === undefined
        ? ([...base, "hr", "engagement", "leaderboard"] as const)
        : ([...base, "hr", "engagement", "leaderboard", top] as const),
    polls: () => [...base, "hr", "engagement", "polls"] as const,
    pollResults: (pollId: number) =>
      [...base, "hr", "engagement", "polls", pollId, "results"] as const,
    communities: () => [...base, "hr", "engagement", "communities"] as const,
    communityMembers: (communityId: number) =>
      [...base, "hr", "engagement", "communities", communityId, "members"] as const,
    campaigns: () => [...base, "hr", "engagement", "campaigns"] as const,
  },

  hrSuccession: {
    all: [...base, "hr", "succession"] as const,
    list: () => [...base, "hr", "succession", "list"] as const,
  },
} as const;
