import { commentDraftContract, commentDraftListContract, generatedCommentDraftSchema } from "./comment-drafts-schema";

it("accepts the PUT /build/comment-drafts/tickets/:ticketId response, which the service returns as a bare commentDrafts row with no ticket join", () => {
  const raw = {
    id: 5,
    ticketId: 42,
    body: "Draft body",
    createdAt: "2026-09-16T00:00:00.000Z",
    updatedAt: "2026-09-16T00:00:00.000Z",
  };

  const result = commentDraftContract.parse(raw);

  expect(result.ticket).toBeUndefined();
  expect(result.ticketId).toBe(42);
});

it("still accepts the GET /build/comment-drafts/mine shape, which joins tickets and always sends a nested ticket", () => {
  const ticket = {
    id: 42,
    type: "TASK",
    title: "Fix the thing",
    projectId: 7,
    status: "TODO",
    ticketNumber: 12,
    projectKey: "ENG",
    priority: "HIGH",
    projectName: "Engineering",
    assignee: {
      id: "user-1",
      name: "Alex",
      image: null,
      firstName: "Alex",
      lastName: null,
    },
  };
  const raw = [
    {
      id: 5,
      ticketId: 42,
      body: "Draft body",
      createdAt: "2026-09-16T00:00:00.000Z",
      updatedAt: "2026-09-16T00:00:00.000Z",
      ticket,
    },
  ];

  const result = commentDraftListContract.parse(raw);

  expect(result[0]?.ticket).toEqual(ticket);
});

it("rejects a draft whose ticketId is not a number, since the drafts page keys the list on it", () => {
  const raw = {
    id: 5,
    ticketId: "42",
    body: "Draft body",
    createdAt: "2026-09-16T00:00:00.000Z",
    updatedAt: "2026-09-16T00:00:00.000Z",
  };

  expect(commentDraftContract.safeParse(raw).success).toBe(false);
});

const validGeneratedDraft = {
  id: 10,
  orgId: "org-abc",
  membershipId: null,
  ticketId: 42,
  body: "AI-generated comment body",
  evidence: null,
  proposedChange: null,
  impact: null,
  confidence: null,
  affectedRecordIds: null,
  retryCount: null,
  lastError: null,
  createdAt: "2026-09-19T00:00:00.000Z",
  updatedAt: "2026-09-19T00:00:00.000Z",
  aiUsage: {
    model: "claude-3-5-haiku-20241022",
    promptTokens: 200,
    completionTokens: 80,
    totalTokens: 280,
    credits: 0.0028,
    costUsd: 0.000056,
  },
};

it("accepts a valid POST /build/comment-drafts/tickets/:ticketId/generate-draft response", () => {
  const result = generatedCommentDraftSchema.parse(validGeneratedDraft);
  expect(result.body).toBe("AI-generated comment body");
  expect(result.aiUsage.totalTokens).toBe(280);
});

it("accepts nullable agent-pulse fields — evidence, proposedChange, impact, confidence, affectedRecordIds", () => {
  const result = generatedCommentDraftSchema.parse(validGeneratedDraft);
  expect(result.evidence).toBeNull();
  expect(result.proposedChange).toBeNull();
  expect(result.impact).toBeNull();
  expect(result.confidence).toBeNull();
  expect(result.affectedRecordIds).toBeNull();
});

it("rejects a generated draft missing aiUsage, which would silently strip spend from the UI", () => {
  const { aiUsage: _dropped, ...withoutUsage } = validGeneratedDraft;
  expect(generatedCommentDraftSchema.safeParse(withoutUsage).success).toBe(false);
});

it("rejects a generated draft whose aiUsage is missing totalTokens", () => {
  const raw = { ...validGeneratedDraft, aiUsage: { model: "x", promptTokens: 1, completionTokens: 1, credits: 0, costUsd: 0 } };
  expect(generatedCommentDraftSchema.safeParse(raw).success).toBe(false);
});
