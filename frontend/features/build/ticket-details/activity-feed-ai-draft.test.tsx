import React from "react";
import { render, screen, act } from "@testing-library/react";
import { ActivityFeed } from "./activity-feed";

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "user-1", name: "Tester", image: null } } }),
}));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual("@tanstack/react-query");
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: jest.fn(),
      setQueryData: jest.fn(),
      getQueryData: jest.fn().mockReturnValue(undefined),
    }),
  };
});

const mockUseCan = jest.fn<boolean, [string]>();
jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => mockUseCan(key),
  useAccess: () => ({ data: null, refetch: jest.fn() }),
}));

type ActionLike = {
  key: string;
  label: string;
  run: (signal?: AbortSignal) => Promise<{ text: string; aiUsage?: unknown }>;
  onApply?: (text: string) => void;
};
let capturedActions: ActionLike[] = [];
jest.mock("@/components/ai/ai-actions-menu", () => ({
  AiActionsMenu: ({ actions }: { actions: ActionLike[] }) => {
    capturedActions = actions;
    return <div data-testid="ai-draft-menu" />;
  },
}));

const mockMutateAsync = jest.fn();
jest.mock("@/hooks/api/build/comment-drafts", () => ({
  useUpsertCommentDraft: () => ({ mutate: jest.fn() }),
  useDeleteCommentDraftByTicket: () => ({ mutate: jest.fn() }),
  useGenerateCommentDraft: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

jest.mock("@/hooks/api/build", () => ({
  useAddComment: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock("@/hooks/api/build/tickets", () => ({
  useCreateTicket: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock("@/hooks/api/build/comment-mutations", () => ({
  useUpdateComment: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteComment: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock("@/hooks/api/build/reactions", () => ({
  useAddReaction: () => ({ mutate: jest.fn() }),
  useRemoveReaction: () => ({ mutate: jest.fn() }),
}));
jest.mock("@/features/build/comments/mention-textarea", () => ({
  MentionTextarea: ({ value, onChange, ...rest }: { value: string; onChange: (v: string) => void; [k: string]: unknown }) => (
    <textarea data-testid="comment-textarea" value={value} onChange={(e) => onChange(e.target.value)} {...(rest as object)} />
  ),
}));
jest.mock("./comment-item", () => ({
  CommentItem: () => null,
}));
jest.mock("@/components/shared/format-ticket-key", () => ({
  getTicketDetailHref: () => "/build/1/tickets/1",
}));
jest.mock("@/lib/query-keys/accounting-and-support", () => ({
  accountingAndSupportQueryKeys: { ticketActivity: { list: () => ["ticket-activity"] } },
}));

const defaultProps = { ticketId: 1, projectId: 1, comments: [] };

function renderFeed(canAi = false, canUpdate = false) {
  mockUseCan.mockImplementation((key: string) => {
    if (key === "build:ai:use") return canAi;
    if (key === "build:tickets:update") return canUpdate;
    if (key === "build:tickets:create") return false;
    return false;
  });
  return render(<ActivityFeed {...defaultProps} />);
}

beforeEach(() => {
  capturedActions = [];
  mockMutateAsync.mockReset();
});

it("does not render the AI draft menu when build:ai:use is denied", () => {
  renderFeed(false);
  expect(screen.queryByTestId("ai-draft-menu")).not.toBeInTheDocument();
});

it("renders the AI draft menu when build:ai:use is granted", () => {
  renderFeed(true);
  expect(screen.getByTestId("ai-draft-menu")).toBeInTheDocument();
});

it("successful generation puts text in the composer and does not post a comment", async () => {
  const generatedDraft = {
    id: 1, orgId: "org-1", membershipId: null, ticketId: 1,
    body: "AI-written comment text",
    evidence: null, proposedChange: null, impact: null, confidence: null,
    affectedRecordIds: null, retryCount: null, lastError: null,
    createdAt: "2026-09-19T00:00:00.000Z", updatedAt: "2026-09-19T00:00:00.000Z",
    aiUsage: { model: "claude-3-5-haiku", promptTokens: 100, completionTokens: 50, totalTokens: 150, credits: 0.001, costUsd: 0.0001 },
  };
  mockMutateAsync.mockResolvedValue(generatedDraft);
  renderFeed(true, true);

  const action = capturedActions[0];
  expect(action).toBeDefined();

  const result = await action.run();
  expect(result.text).toBe("AI-written comment text");

  await act(async () => { action.onApply?.("AI-written comment text"); });

  expect(screen.getByTestId("comment-textarea")).toHaveValue("AI-written comment text");
  expect(mockMutateAsync).toHaveBeenCalledTimes(1);
});

it("run() returns aiUsage from the generated draft so AiUsageChip can render the spend", async () => {
  const aiUsage = { model: "claude-3-5-haiku", promptTokens: 200, completionTokens: 80, totalTokens: 280, credits: 0.0028, costUsd: 0.000056 };
  mockMutateAsync.mockResolvedValue({
    id: 1, orgId: "org-1", membershipId: null, ticketId: 1,
    body: "Draft", evidence: null, proposedChange: null, impact: null, confidence: null,
    affectedRecordIds: null, retryCount: null, lastError: null,
    createdAt: "2026-09-19T00:00:00.000Z", updatedAt: "2026-09-19T00:00:00.000Z",
    aiUsage,
  });
  renderFeed(true);

  const result = await capturedActions[0].run();
  expect(result.aiUsage).toMatchObject({ totalTokens: 280, credits: 0.0028, model: "claude-3-5-haiku" });
});

it("run() propagates a 402 error so getErrorMessage can surface insufficient-credits to the user", async () => {
  const creditError = Object.assign(new Error("Insufficient AI credits"), { status: 402 });
  mockMutateAsync.mockRejectedValue(creditError);
  renderFeed(true);

  await expect(capturedActions[0].run()).rejects.toThrow("Insufficient AI credits");
});
