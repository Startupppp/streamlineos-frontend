import React from "react";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import { ActivityFeed } from "./activity-feed";
import type { StagedCommentDraft } from "@/hooks/api/build/comment-draft-commands";

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
const mockUploadFile = jest.fn();
const mockAddAttachment = jest.fn();
const mockStage = jest.fn<StagedCommentDraft, [{ ticketId: number; body: string }]>();
const mockFlush = jest.fn();
let mockDraftLoadError: Error | null = null;
jest.mock("@/hooks/api/build/comment-draft-commands", () => ({
  useUpsertCommentDraft: () => ({ stageEdit: mockStage, flushStaged: mockFlush, isOnline: true, isPending: false, error: null, receipt: null }),
  useDeleteCommentDraftByTicket: () => ({ mutate: jest.fn() }),
}));
jest.mock("@/hooks/api/build/comment-drafts-read", () => ({
  useTicketCommentDraft: () => ({
    owner: { scope: "authenticated:org-1:user-1", key: "authenticated:org-1:user-1:session-1", identity: { userId: "user-1", orgId: "org-1", sessionId: "session-1" } },
    fresh: false, data: undefined, dataUpdatedAt: 0, isFetching: false, isError: mockDraftLoadError !== null, error: mockDraftLoadError, refetch: jest.fn(),
  }),
}));
jest.mock("@/hooks/api/build/comment-drafts", () => ({
  useGenerateCommentDraft: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

jest.mock("@/hooks/api/build/ticket-sub-resources", () => ({
  useAddComment: () => ({ mutate: jest.fn(), isPending: false }),
  useAddAttachment: () => ({ mutateAsync: mockAddAttachment, isPending: false }),
}));
jest.mock("@/hooks/api/build/project-files", () => ({
  MAX_PROJECT_FILE_BYTES: 2 * 1024 * 1024,
  useUploadProjectFile: () => ({ mutateAsync: mockUploadFile, isPending: false }),
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
  MentionTextarea: ({ value, onChange, wrapperClassName: _wrapperClassName, users: _users, ...rest }: { value: string; onChange: (v: string) => void; wrapperClassName?: string; users?: unknown[]; [k: string]: unknown }) => (
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
  mockDraftLoadError = null;
  mockUploadFile.mockReset().mockResolvedValue({ id: 91 });
  mockAddAttachment.mockReset().mockResolvedValue({ id: 501 });
  localStorage.clear();
  mockFlush.mockReset().mockResolvedValue(null);
  mockStage.mockReset().mockImplementation(({ ticketId, body }) => ({
    scope: "authenticated:org-1:user-1", key: "authenticated:org-1:user-1:session-1",
    identity: { userId: "user-1", orgId: "org-1", sessionId: "session-1" },
    entry: { kind: "upsert", ticketId, body, revision: "00000000-0000-4000-8000-000000000001" },
  }));
});

it("does not render the AI draft menu when build:ai:use is denied", () => {
  renderFeed(false);
  expect(screen.queryByTestId("ai-draft-menu")).not.toBeInTheDocument();
});

it("renders the AI draft menu when build:ai:use is granted", () => {
  renderFeed(true);
  expect(screen.getByTestId("ai-draft-menu")).toBeInTheDocument();
});

it("offers a file picker without restricting MIME types when file management is granted", () => {
  mockUseCan.mockImplementation((key: string) => key === "build:tickets:update" || key === "build:files:manage");
  render(<ActivityFeed {...defaultProps} />);
  const input = document.querySelector('input[type="file"]');
  expect(input).not.toBeNull();
  expect(input).toHaveAttribute("type", "file");
  expect(input).toHaveAttribute("multiple");
  expect(input).not.toHaveAttribute("accept");
});

it("uploads a video through the project file owner and attaches it to the current ticket", async () => {
  mockUseCan.mockImplementation((key: string) => key === "build:tickets:update" || key === "build:files:manage");
  render(<ActivityFeed {...defaultProps} />);
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  const video = new File(["video"], "walkthrough.mp4", { type: "video/mp4" });
  fireEvent.change(input, { target: { files: [video] } });
  await waitFor(() => expect(mockUploadFile).toHaveBeenCalledWith(video));
  expect(mockAddAttachment).toHaveBeenCalledWith({ ticketId: 1, projectId: 1, fileId: 91 });
});

it("replaces saved status with an inline failure and retries through a native button", async () => {
  jest.useFakeTimers();
  mockFlush.mockRejectedValueOnce(new Error("Storage unavailable"));
  renderFeed(false, true);
  fireEvent.change(screen.getByTestId("comment-textarea"), { target: { value: "Keep this draft" } });
  await act(async () => { jest.advanceTimersByTime(1200); await Promise.resolve(); });
  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent("Failed to save.");
  expect(screen.queryByText("Saved")).toBeNull();
  const retry = screen.getByRole("button", { name: "Retry" });
  expect(retry).not.toHaveAttribute("data-slot", "button");
  mockFlush.mockResolvedValueOnce(null);
  fireEvent.click(retry);
  await act(async () => { await Promise.resolve(); });
  await waitFor(() => expect(screen.queryByText("Failed to save.")).toBeNull());
  jest.useRealTimers();
});

it("renders saved-draft load failure as one compact row with a native ghost retry", () => {
  mockDraftLoadError = new Error("Unavailable");
  const { container } = renderFeed(false, true);
  const alert = screen.getByRole("alert");
  expect(alert).toHaveTextContent("Couldn't load the saved draft");
  expect(alert).not.toHaveClass("flex-wrap");
  expect(alert.querySelector("span")).toHaveClass("truncate");
  const retry = screen.getByRole("button", { name: "Retry" });
  expect(retry).not.toHaveAttribute("data-slot", "button");
  expect(container.querySelector('[data-slot="button"]')).not.toHaveTextContent("Retry");
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
  expect(mockStage).toHaveBeenCalledWith({ ticketId: 1, body: "AI-written comment text" });
  expect(mockFlush).not.toHaveBeenCalled();
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
