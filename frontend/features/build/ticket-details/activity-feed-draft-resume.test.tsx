import { act, fireEvent, render, screen } from "@testing-library/react";
import type { CommentDraft } from "@/hooks/api/build/comment-drafts";
import { ActivityFeed } from "./activity-feed";

const mockSave = jest.fn();
const mockRetry = jest.fn();
const mockPost = jest.fn();
const mockDeleteDraft = jest.fn();
let mockDraft: CommentDraft | null = null;
let mockError: Error | null = null;
let mockOwnerKey = "authenticated:org-a:user-a:session-a";
let mockFresh = true;
let mockEditable = true;

jest.mock("next-auth/react", () => ({ useSession: () => ({ data: { user: { id: "user-a" } } }) }));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));
jest.mock("@/hooks/api/access", () => ({ useCan: (permission: string) => permission === "build:tickets:update" && mockEditable }));
jest.mock("@/hooks/api/build/comment-drafts", () => ({
  useTicketCommentDraft: () => ({
    owner: { scope: "authenticated:org-a:user-a", key: mockOwnerKey },
    fresh: mockFresh, data: { draft: mockDraft }, dataUpdatedAt: 0,
    isFetching: !mockFresh, isError: mockError !== null, error: mockError, refetch: mockRetry,
  }),
  useUpsertCommentDraft: () => ({ mutate: mockSave }),
  useDeleteCommentDraftByTicket: () => ({ mutate: mockDeleteDraft }),
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
  return { id: 1, ticketId, body, createdAt: "2026-10-03T00:00:00.000Z", updatedAt: "2026-10-03T00:00:00.000Z" };
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
});
afterEach(() => jest.useRealTimers());

it("shows the saved body in the existing editor without posting or resaving it", () => {
  render(<ActivityFeed ticketId={7} projectId={1} comments={[]} />);
  expect(screen.getByRole("textbox", { name: "Comment body" })).toHaveValue("saved draft");
  act(() => jest.advanceTimersByTime(1500));
  expect(mockSave).not.toHaveBeenCalled();
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
  expect(mockSave).toHaveBeenCalledWith({ ticketId: 7, body: "edited draft" });
  expect(mockPost).not.toHaveBeenCalled();
});

it("does not render a composer for a user without ticket update permission", () => {
  mockEditable = false;
  render(<ActivityFeed ticketId={7} projectId={1} comments={[]} />);
  expect(screen.queryByRole("textbox")).toBeNull();
  expect(mockSave).not.toHaveBeenCalled();
  expect(mockPost).not.toHaveBeenCalled();
});
