import { ZodError } from "zod";

import {
  roadmapItemContract,
  roadmapPageContract,
  roadmapPrioritizationContract,
  roadmapSignalsContract,
  feedbackPostContract,
  feedbackPageContract,
  changelogEntryContract,
  changelogPageContract,
  applyTemplateResultContract,
} from "./roadmap-schema";

const UNSCORED_PRIORITIZATION = {
  method: "rice",
  score: null,
  isComplete: false,
  missingInputs: ["reach", "impact", "confidence", "effort"],
  unavailableReason: "missing_inputs",
};

const UNWEIGHTED_TIER = {
  tierWeighted: false,
  tier: null,
  weight: null,
  weightedScore: null,
  unweightedReason: "no_linked_feedback",
  linkedFeedbackCount: 0,
  linkedAccountCount: 0,
  linkedRevenue: null,
  revenueKnownAccountCount: 0,
};

function baseRoadmapItem(status: string) {
  return {
    id: 1,
    orgId: "org-1",
    title: "Ship the thing",
    description: null,
    status,
    category: null,
    isPublic: true,
    projectId: null,
    epicTicketId: null,
    targetQuarter: null,
    sortOrder: 0,
    votes: 0,
    reach: null,
    impact: null,
    confidence: null,
    effort: null,
    createdBy: null,
    createdAt: "2026-09-16T00:00:00.000Z",
    updatedAt: "2026-09-16T00:00:00.000Z",
    deletedAt: null,
    prioritization: UNSCORED_PRIORITIZATION,
    tierWeighting: UNWEIGHTED_TIER,
  };
}

function baseFeedbackPost(status: string) {
  return {
    id: 1,
    orgId: "org-1",
    title: "Add dark mode",
    description: null,
    status,
    category: null,
    votes: 0,
    submittedByName: null,
    submittedByEmail: null,
    crmContactId: null,
    crmOrganizationId: null,
    accountValueSnapshot: null,
    accountTierSnapshot: null,
    linkedRoadmapItemId: null,
    duplicateOfId: null,
    mergedAt: null,
    createdBy: null,
    createdAt: "2026-09-16T00:00:00.000Z",
    updatedAt: "2026-09-16T00:00:00.000Z",
    deletedAt: null,
  };
}

function baseChangelogEntry(type: string) {
  return {
    id: 1,
    orgId: "org-1",
    title: "Release notes",
    content: "",
    type,
    version: null,
    isPublished: false,
    linkedRoadmapItemId: null,
    publishedAt: null,
    createdBy: null,
    createdAt: "2026-09-16T00:00:00.000Z",
    updatedAt: "2026-09-16T00:00:00.000Z",
  };
}

it("accepts every roadmap_status value the roadmap_items pgEnum actually holds", () => {
  for (const status of ["planned", "in_progress", "completed", "cancelled"]) {
    expect(() => roadmapItemContract.parse(baseRoadmapItem(status))).not.toThrow();
  }
});

it("rejects a roadmap status outside the roadmap_status pgEnum instead of accepting any string", () => {
  expect(() => roadmapItemContract.parse(baseRoadmapItem("archived"))).toThrow(ZodError);
});

it("parses a GET /build/roadmap page whose rows carry status, matching the full row .returning() sends", () => {
  const page = {
    data: [baseRoadmapItem("in_progress")],
    pagination: { limit: 50, hasMore: false, nextCursor: null },
  };
  expect(() => roadmapPageContract.parse(page)).not.toThrow();
});

it("rejects a roadmap row that omits prioritization, so a missing score cannot be silently stripped to undefined", () => {
  const raw: Record<string, unknown> = baseRoadmapItem("planned");
  delete raw.prioritization;
  expect(() => roadmapItemContract.parse(raw)).toThrow(ZodError);
});

it("keeps the computed score on a parsed roadmap row rather than dropping an unknown key", () => {
  const scored = {
    ...baseRoadmapItem("planned"),
    reach: 1000,
    impact: 3,
    confidence: 80,
    effort: 4,
    prioritization: {
      method: "rice",
      score: 600,
      isComplete: true,
      missingInputs: [],
      unavailableReason: null,
    },
  };
  expect(roadmapItemContract.parse(scored).prioritization.score).toBe(600);
});

it("accepts the backend's non_positive_effort reason so an effort of zero renders as unscored, not as an error", () => {
  const parsed = roadmapPrioritizationContract.parse({
    method: "rice",
    score: null,
    isComplete: false,
    missingInputs: [],
    unavailableReason: "non_positive_effort",
  });
  expect(parsed.unavailableReason).toBe("non_positive_effort");
});

it("rejects a prioritization reason the backend never emits", () => {
  expect(() =>
    roadmapPrioritizationContract.parse({
      method: "rice",
      score: null,
      isComplete: false,
      missingInputs: [],
      unavailableReason: "too_expensive",
    }),
  ).toThrow(ZodError);
});

it("parses GET /build/roadmap/:itemId/signals field for field, including a null progressPercent", () => {
  const parsed = roadmapSignalsContract.parse({
    itemId: 7,
    prioritization: UNSCORED_PRIORITIZATION,
    tierWeighting: UNWEIGHTED_TIER,
    demand: { votes: 12, linkedFeedbackCount: 3, openLinkedFeedbackCount: 2 },
    delivery: {
      projectId: 4,
      epicTicketId: null,
      source: "project",
      linkedTicketCount: 0,
      countedTicketCount: 0,
      completedTicketCount: 0,
      progressPercent: null,
    },
  });
  expect(parsed.delivery.progressPercent).toBeNull();
  expect(parsed.demand.linkedFeedbackCount).toBe(3);
});

it("rejects a delivery source the backend never emits", () => {
  expect(() =>
    roadmapSignalsContract.parse({
      itemId: 7,
      prioritization: UNSCORED_PRIORITIZATION,
      demand: { votes: 0, linkedFeedbackCount: 0, openLinkedFeedbackCount: 0 },
      delivery: {
        projectId: null,
        epicTicketId: null,
        source: "crm_account",
        linkedTicketCount: 0,
        countedTicketCount: 0,
        completedTicketCount: 0,
        progressPercent: null,
      },
    }),
  ).toThrow(ZodError);
});

it("rejects a roadmap row that omits tierWeighting, so an unweighted score cannot pass as a weighted one", () => {
  const raw: Record<string, unknown> = baseRoadmapItem("planned");
  delete raw.tierWeighting;
  expect(() => roadmapItemContract.parse(raw)).toThrow(ZodError);
});

it("keeps the weighted score and the tier that produced it on a parsed row", () => {
  const weighted = {
    ...baseRoadmapItem("planned"),
    reach: 1000,
    impact: 3,
    confidence: 80,
    effort: 4,
    prioritization: {
      method: "rice",
      score: 600,
      isComplete: true,
      missingInputs: [],
      unavailableReason: null,
    },
    tierWeighting: {
      tierWeighted: true,
      tier: "enterprise",
      weight: 4,
      weightedScore: 2400,
      unweightedReason: null,
      linkedFeedbackCount: 3,
      linkedAccountCount: 2,
      linkedRevenue: 1500,
      revenueKnownAccountCount: 2,
    },
  };
  const parsed = roadmapItemContract.parse(weighted);
  expect(parsed.tierWeighting.weightedScore).toBe(2400);
  expect(parsed.tierWeighting.tier).toBe("enterprise");
});

it("accepts every reason the backend can give for leaving a score unweighted", () => {
  for (const reason of [
    "no_linked_feedback",
    "no_linked_account",
    "account_tier_unset",
    "score_unavailable",
  ]) {
    const raw = { ...baseRoadmapItem("planned"), tierWeighting: { ...UNWEIGHTED_TIER, unweightedReason: reason } };
    expect(() => roadmapItemContract.parse(raw)).not.toThrow();
  }
});

it("rejects a tier the backend never emits, so an unpriced label cannot reach the badge", () => {
  const raw = {
    ...baseRoadmapItem("planned"),
    tierWeighting: { ...UNWEIGHTED_TIER, tier: "platinum" },
  };
  expect(() => roadmapItemContract.parse(raw)).toThrow(ZodError);
});

it("accepts every feedback_status value the feedback_posts pgEnum actually holds", () => {
  for (const status of ["open", "planned", "in_progress", "completed", "declined"]) {
    expect(() => feedbackPostContract.parse(baseFeedbackPost(status))).not.toThrow();
  }
});

it("rejects a feedback status outside the feedback_status pgEnum instead of accepting any string", () => {
  expect(() => feedbackPostContract.parse(baseFeedbackPost("closed"))).toThrow(ZodError);
});

it("parses a GET /build/feedback page whose rows carry status, matching the full row .returning() sends", () => {
  const page = {
    data: [baseFeedbackPost("declined")],
    pagination: { limit: 50, hasMore: false, nextCursor: null },
  };
  expect(() => feedbackPageContract.parse(page)).not.toThrow();
});

it("accepts every changelog_type value the changelog_entries pgEnum actually holds", () => {
  for (const type of ["feature", "improvement", "fix"]) {
    expect(() => changelogEntryContract.parse(baseChangelogEntry(type))).not.toThrow();
  }
});

it("rejects a changelog type outside the changelog_type pgEnum instead of accepting any string", () => {
  expect(() => changelogEntryContract.parse(baseChangelogEntry("breaking"))).toThrow(ZodError);
});

it("parses a GET /build/changelog page whose rows carry type, matching the full row .returning() sends", () => {
  const page = {
    data: [baseChangelogEntry("fix")],
    pagination: { limit: 50, hasMore: false, nextCursor: null },
  };
  expect(() => changelogPageContract.parse(page)).not.toThrow();
});

it("accepts the flat projectId/key/ticketsCreated shape applyTemplate actually returns, not the nested project/tickets shape its backend ResponseSchema declares", () => {
  const result = applyTemplateResultContract.parse({
    projectId: 42,
    key: "PRJ-001",
    ticketsCreated: 3,
  });
  expect(result).toEqual({ projectId: 42, key: "PRJ-001", ticketsCreated: 3 });
});
