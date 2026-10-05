import { act, fireEvent, render, screen } from "@testing-library/react";
import type { CommentDraft } from "@/hooks/api/build/comment-draft-command-cache";
import type { StagedCommentDraft } from "@/hooks/api/build/comment-draft-commands";
import { ApiError } from "@/lib/api-envelope";
import { ActivityFeed } from "./activity-feed";

const mockSave = jest.fn();
const mockStage = jest.fn<StagedCommentDraft, [{ ticketId: number; body: string }]>();
const mockRetry = jest.fn();
const mockPost = jest.fn();
const mockDeleteDraft = jest.fn();
let mockDraft: CommentDraft | null = null;
let mockError: Error | null = null;
let mockOwnerKey = "authenticated:org-a:user-a:session-a";
let mockFresh = true;
let mockEditable = true;
let mockReceipt: { ownerKey: string; revision: string } | null = null;

jest.mock("next-auth/react", () => ({ useSession: () => ({ data: { user: { id: "user-a" } } }) }));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));
jest.mock("@/hooks/api/access", () => ({ useCan: (permission: string) => permission === "build:tickets:update" && mockEditable }));
jest.mock("@/hooks/api/build/comment-drafts-read", () => ({
  useTicketCommentDraft: () => ({
    owner: { scope: "authenticated:org-a:user-a", key: mockOwnerKey, identity: { userId: "user-a", orgId: "org-a", sessionId: "session-a" } },
    fresh: mockFresh, data: { draft: mockDraft }, dataUpdatedAt: 0,
    isFetching: !mockFresh, isError: mockError !== null, error: mockError, refetch: mockRetry,
  }),
}));
jest.mock("@/hooks/api/build/comment-draft-commands", () => ({
  useUpsertCommentDraft: () => ({ stageEdit: mockStage, flushStaged: mockSave, isOnline: true, isPending: false, receipt: mockReceipt, error: null }),
  useDeleteCommentDraftByTicket: () => ({ mutate: mockDeleteDraft }),
}));
jest.mock("@/hooks/api/build/comment-drafts", () => ({
  useGenerateCommentDraft: () => ({ mutateAsync: jest.fn() }),
}));
jest.mock("@/hooks/api/build/ticket-sub-resources", () => ({ useAddComment: () => ({ mutate: mockPost, isPending: false }) }));
jest.mock("@/hooks/api/build/tickets", () => ({ useCreateTicket: () => ({ mutate: jest.fn() }) }));
jest.mock("@/hooks/api/build/comment-mutations", () => ({
  useUpdateComment: () => ({ mutate: jest.fn() }), useDeleteComment: () => ({ mutate: jest.fn() }),
}));
jest.mock("@/hooks/api/build/reactions", () => ({
  useAddReaction: () => ({ mutate: jest.fn() }), useRemoveReaction: () => ({ mutate: jest.fn() }),
}));
jest.mock("@/features/build/comments/mention-textarea", () => ({
  MentionTextarea: ({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) => {
    function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) { onChange(event.target.value); }
    return <textarea value={value} onChange={handleChange} placeholder={placeholder} aria-label="Comment body" />;
  },
}));
jest.mock("./comment-item", () => ({ CommentItem: () => null }));
jest.mock("@/components/ai/ai-actions-menu", () => ({ AiActionsMenu: () => null }));
jest.mock("@/components/ui/animated-icon-button", () => ({
  AnimatedIconButton: ({ onClick, disabled, "aria-label": label }: { onClick: () => void; disabled: boolean; "aria-label": string }) => <button type="button" onClick={onClick} disabled={disabled} aria-label={label} />,
}));

function savedDraft(body = "saved draft", ticketId = 7): CommentDraft {
  return { id: 1, ticketId, orgId: "test-org", membershipId: null, body, createdAt: "2026-10-03T00:00:00.000Z", updatedAt: "2026-10-03T00:00:00.000Z" };
}

beforeEach(() => {
  localStorage.clear();
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockDraft = savedDraft();
  mockError = null;
  mockFresh = true;
  mockEditable = true;
  mockOwnerKey = "authenticated:org-a:user-a:session-a";
  mockReceipt = null;
  mockSave.mockReset().mockResolvedValue(null);
  mockStage.mockReset().mockImplementation(({ ticketId, body }) => ({
    scope: "authenticated:org-a:user-a", key: mockOwnerKey,
    identity: { userId: "user-a", orgId: "org-a", sessionId: "session-a" },
    entry: body.trim() ? { kind: "upsert", ticketId, body, revision: "00000000-0000-4000-8000-000000000001" } : { kind: "delete", ticketId, revision: "00000000-0000-4000-8000-000000000001" },
  }));
});
afterEach(() => jest.useRealTimers());

it("shows the saved body in the existing editor without posting or resaving it", () => {
  render(<ActivityFeed ticketId={7} projectId={1} comments={[]} />);
  expect(screen.getByRole("textbox", { name: "Comment body" })).toHaveValue("saved draft");
  act(() => jest.advanceTimersByTime(1500));
  expect(mockSave).not.toHaveBeenCalled();
  expect(mockStage).not.toHaveBeenCalled();
  expect(mockPost).not.toHaveBeenCalled();
  expect(mockDeleteDraft).not.toHaveBeenCalled();
});

it("shows the failed read and the existing default retry button without clearing editor text", () => {
  mockFresh = false;
  mockError = new Error("Saved draft unavailable");
  render(<ActivityFeed ticketId={7} projectId={1} comments={[]} />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "my text" } });
  expect(screen.getByRole("alert")).toHaveTextContent("Saved draft unavailable");
  fireEvent.click(screen.getByRole("button", { name: "Retry draft" }));
  expect(mockRetry).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("textbox")).toHaveValue("my text");
  expect(mockPost).not.toHaveBeenCalled();
});

it("drops old ticket editor text immediately when the shared detail surface changes ticket", () => {
  const feed = render(<ActivityFeed ticketId={7} projectId={1} comments={[]} />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "private old ticket text" } });
  mockFresh = false;
  feed.rerender(<ActivityFeed ticketId={8} projectId={1} comments={[]} />);
  expect(screen.getByRole("textbox")).toHaveValue("");
  expect(screen.getByRole("status")).toHaveTextContent("Loading saved draft");
  act(() => jest.advanceTimersByTime(1500));
  expect(mockSave).not.toHaveBeenCalled();
});

it("keeps new edits when a draft refetch arrives and saves only the edit", () => {
  const feed = render(<ActivityFeed ticketId={7} projectId={1} comments={[]} />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "edited draft" } });
  mockDraft = savedDraft("stale refetch");
  feed.rerender(<ActivityFeed ticketId={7} projectId={1} comments={[]} />);
  expect(screen.getByRole("textbox")).toHaveValue("edited draft");
  act(() => jest.advanceTimersByTime(1200));
  expect(mockStage).toHaveBeenCalledWith({ ticketId: 7, body: "edited draft" });
  expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ key: mockOwnerKey, entry: expect.objectContaining({ kind: "upsert", ticketId: 7, body: "edited draft" }) }));
  expect(mockPost).not.toHaveBeenCalled();
});

it("uses the existing default status presentation for local recovery and confirmed server save", () => {
  const feed = render(<ActivityFeed ticketId={7} projectId={1} comments={[]} />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "persisted text" } });
  expect(screen.getByRole("status")).toHaveTextContent("Saved on this device");
  expect(mockSave).not.toHaveBeenCalled();
  mockReceipt = { ownerKey: mockOwnerKey, revision: "00000000-0000-4000-8000-000000000001" };
  feed.rerender(<ActivityFeed ticketId={7} projectId={1} comments={[]} />);
  expect(screen.getByRole("status")).toHaveTextContent("Saved");
  expect(screen.getByRole("status")).not.toHaveTextContent("this device");
});

it("shows a default storage error and retry without losing typed text or posting", async () => {
  mockStage.mockImplementationOnce(() => { throw new ApiError("Draft could not be stored", undefined, "DRAFT_STORAGE_UNAVAILABLE"); });
  render(<ActivityFeed ticketId={7} projectId={1} comments={[]} />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "retain text" } });
  expect(screen.getByRole("alert")).toHaveTextContent("Draft could not be stored");
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Retry saving draft" })); });
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByRole("textbox")).toHaveValue("retain text");
  expect(mockStage).toHaveBeenCalledTimes(2);
  expect(mockSave).toHaveBeenCalledTimes(1);
  expect(mockPost).not.toHaveBeenCalled();
});

it("offers an exact-revision retry for a failed save using the existing default button", async () => {
  mockSave.mockRejectedValueOnce(new Error("Temporary draft outage"));
  render(<ActivityFeed ticketId={7} projectId={1} comments={[]} />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "retry this revision" } });
  await act(async () => { jest.advanceTimersByTime(1200); });
  expect(screen.getByRole("alert")).toHaveTextContent("Temporary draft outage");
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Retry saving draft" })); });
  expect(mockStage).toHaveBeenCalledTimes(1);
  expect(mockSave).toHaveBeenCalledTimes(2);
  expect(mockSave.mock.calls[1]?.[0]).toEqual(mockSave.mock.calls[0]?.[0]);
  expect(screen.getByRole("textbox")).toHaveValue("retry this revision");
  expect(mockPost).not.toHaveBeenCalled();
});

it("does not render a composer for a user without ticket update permission", () => {
  mockEditable = false;
  render(<ActivityFeed ticketId={7} projectId={1} comments={[]} />);
  expect(screen.queryByRole("textbox")).toBeNull();
  expect(mockSave).not.toHaveBeenCalled();
  expect(mockPost).not.toHaveBeenCalled();
});
