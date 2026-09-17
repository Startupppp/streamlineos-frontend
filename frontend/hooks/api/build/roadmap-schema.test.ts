import {
  roadmapItemContract,
  roadmapPageContract,
  feedbackPostContract,
  feedbackPageContract,
  changelogEntryContract,
  changelogPageContract,
  applyTemplateResultContract,
} from "./roadmap-schema";

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
  expect(() => roadmapItemContract.parse(baseRoadmapItem("archived"))).toThrow();
});

it("parses a GET /build/roadmap page whose rows carry status, matching the full row .returning() sends", () => {
  const page = {
    data: [baseRoadmapItem("in_progress")],
    pagination: { limit: 50, hasMore: false, nextCursor: null },
  };
  expect(() => roadmapPageContract.parse(page)).not.toThrow();
});

it("accepts every feedback_status value the feedback_posts pgEnum actually holds", () => {
  for (const status of ["open", "planned", "in_progress", "completed", "declined"]) {
    expect(() => feedbackPostContract.parse(baseFeedbackPost(status))).not.toThrow();
  }
});

it("rejects a feedback status outside the feedback_status pgEnum instead of accepting any string", () => {
  expect(() => feedbackPostContract.parse(baseFeedbackPost("closed"))).toThrow();
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
  expect(() => changelogEntryContract.parse(baseChangelogEntry("breaking"))).toThrow();
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
