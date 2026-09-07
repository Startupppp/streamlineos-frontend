import { z } from "zod";

const leaderboardEntryContract = z.object({
  userId: z.string(),
  total: z.number().int(),
});

const employeeOfMonthContract = z.object({
  period: z.string(),
  top: z.object({
    userId: z.string(),
    recognitions: z.number().int(),
    points: z.number().int(),
    score: z.number().int(),
  }).nullable(),
});

export const engagementOverviewContract = z.object({
  employeeOfMonth: employeeOfMonthContract,
  topLeaderboard: z.array(leaderboardEntryContract),
});

export const myMoodHistoryContract = z.array(z.object({
  id: z.number().int(),
  date: z.string(),
  mood: z.number().int(),
  note: z.string().nullable(),
}));

export const orgMoodAggregateContract = z.array(z.object({
  date: z.string(),
  avgMood: z.number(),
  count: z.number().int(),
}));

export const moodCheckinContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  userId: z.string(),
  userMembershipId: z.number().int().nullable(),
  date: z.string(),
  mood: z.number().int(),
  note: z.string().nullable(),
  createdAt: z.string(),
});

const badgeContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  points: z.number().int(),
  createdAt: z.string(),
});

export const listBadgesContract = z.array(badgeContract);

export const awardBadgeContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  badgeId: z.number().int(),
  userId: z.string(),
  userMembershipId: z.number().int().nullable(),
  awardedBy: z.string().nullable(),
  awardedByMembershipId: z.number().int().nullable(),
  reason: z.string().nullable(),
  createdAt: z.string(),
});

export const leaderboardContract = z.array(leaderboardEntryContract);

const pollContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  question: z.string(),
  options: z.array(z.string()),
  status: z.enum(["draft", "active", "closed"]),
  anonymous: z.boolean(),
  createdBy: z.string().nullable(),
  createdByMembershipId: z.number().int().nullable(),
  closesAt: z.string().nullable(),
  createdAt: z.string(),
});

export const listPollsContract = z.array(pollContract);
export const createPollContract = pollContract;

const pollVoteContract = z.object({
  id: z.number().int(),
  orgId: z.string().nullable(),
  pollId: z.number().int(),
  userId: z.string(),
  userMembershipId: z.number().int().nullable(),
  optionIndex: z.number().int(),
  createdAt: z.string(),
});

export const votePollContract = pollVoteContract;

export const pollResultsContract = z.object({
  pollId: z.number().int(),
  question: z.string(),
  anonymous: z.boolean(),
  status: z.enum(["draft", "active", "closed"]),
  totalVotes: z.number().int(),
  counts: z.array(z.object({
    option: z.string(),
    optionIndex: z.number().int(),
    count: z.number().int(),
  })),
});

const communityMemberContract = z.object({
  userId: z.string(),
  role: z.enum(["member", "moderator"]),
});

const communityBaseContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const listCommunitiesContract = z.object({
  items: z.array(communityBaseContract.extend({ members: z.array(communityMemberContract) })),
  nextCursor: z.string().nullable(),
});

export const createCommunityContract = communityBaseContract;

const campaignContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  status: z.enum(["draft", "active", "completed"]),
  audience: z.object({ type: z.string(), ids: z.array(z.string()).optional() }).nullable(),
  createdBy: z.string().nullable(),
  createdByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const listCampaignsContract = z.array(campaignContract);
export const createCampaignContract = campaignContract;
export const updateCampaignContract = campaignContract;

export const successContract = z.object({ success: z.boolean() });
export const voteIdContract = z.object({ id: z.number().int() });
export const deleteCampaignContract = z.object({ success: z.boolean() });
