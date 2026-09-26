import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockAskMutate = jest.fn();
const mockFeedbackMutate = jest.fn();
const mockCreateGapMutate = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/knowledge/chat",
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: null }),
}));

jest.mock("@/hooks/api/kb/ask", () => ({
  useKbAsk: () => ({
    mutate: mockAskMutate,
    isPending: false,
    isError: false,
    stop: jest.fn(),
    resetAttempt: jest.fn(),
  }),
  useKbAiAnswerFeedback: () => ({ mutate: mockFeedbackMutate, isPending: false }),
  useCreateKbKnowledgeGap: () => ({ mutate: mockCreateGapMutate, isPending: false }),
}));

jest.mock("@/hooks/api/kb/chat-history", () => ({
  useKbConversations: () => ({
    data: { pages: [] },
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
  }),
  useRenameKbConversation: () => ({ mutate: jest.fn() }),
  useDeleteKbConversation: () => ({ mutate: jest.fn() }),
  useKbConversationMessages: () => ({
    data: {
      pages: [
        {
          messages: [
            {
              id: 2,
              role: "assistant",
              content: "You get twenty days of leave.",
              citations: null,
              createdAt: "2026-09-01T00:00:00.000Z",
            },
            {
              id: 1,
              role: "user",
              content: "How many days of leave do I get?",
              citations: null,
              createdAt: "2026-09-01T00:00:00.000Z",
            },
          ],
          nextCursor: null,
        },
      ],
    },
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
    isLoading: false,
  }),
}));

jest.mock("@/hooks/api/kb/sources", () => ({
  useKbSources: () => ({
    data: { pages: [{ data: [], pagination: { limit: 50, nextCursor: null, hasMore: false } }] },
    isLoading: false,
  }),
  useUploadKbSource: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteKbSource: () => ({ mutate: jest.fn(), isPending: false, variables: undefined }),
  useCreateKbSourceNote: () => ({ mutate: jest.fn(), isPending: false }),
}));

Object.assign(navigator, { clipboard: { writeText: jest.fn().mockResolvedValue(undefined) } });

import KnowledgeBasePage from "./knowledge-base-page";

function renderPage(): void {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <KnowledgeBasePage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockAskMutate.mockReset();
  mockFeedbackMutate.mockReset();
  mockCreateGapMutate.mockReset();
});

describe("KnowledgeBasePage — Copy and feedback controls on the real Ask KB chat", () => {
  it("renders a Copy control on the assistant's persisted answer", () => {
    renderPage();

    expect(screen.getByRole("button", { name: /copy answer/i })).toBeInTheDocument();
  });

  it("copies the answer text when the Copy control is clicked", async () => {
    renderPage();

    await userEvent.click(screen.getByRole("button", { name: /copy answer/i }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("You get twenty days of leave.");
  });

  it("renders helpful/not-helpful/report-wrong-or-stale controls paired with the original question", async () => {
    renderPage();

    await userEvent.click(screen.getByRole("button", { name: /mark answer as helpful/i }));

    expect(mockFeedbackMutate).toHaveBeenCalledWith(
      { rating: "helpful", question: "How many days of leave do I get?", comment: undefined },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });

  it("offers report-wrong-or-stale on the same answer bubble", async () => {
    renderPage();

    await userEvent.click(screen.getByRole("button", { name: /report answer as wrong or stale/i }));

    expect(mockFeedbackMutate).toHaveBeenCalledWith(
      {
        rating: "not_helpful",
        question: "How many days of leave do I get?",
        comment: "Reported as wrong or stale",
      },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });

  it("does not render answer controls on the user's own bubble", () => {
    renderPage();

    const userBubble = screen.getByText("How many days of leave do I get?");
    expect(userBubble.closest("div")?.querySelector("button")).toBeNull();
  });
});

describe("KnowledgeBasePage — Create knowledge gap on an insufficient-evidence answer", () => {
  it("offers to create a knowledge gap when the KB has no relevant content, and reports the asked question", async () => {
    mockAskMutate.mockImplementation((_input, options) =>
      options.onSuccess({ hasContext: false, answer: "", citations: [], conversationId: 9 }),
    );
    mockCreateGapMutate.mockImplementation((_input, options) => options.onSuccess());
    renderPage();

    await userEvent.type(screen.getByPlaceholderText(/ask anything/i), "Where is the expense policy?");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText(/no relevant content found/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /create a knowledge gap/i }));

    expect(mockCreateGapMutate).toHaveBeenCalledWith(
      { question: "Where is the expense policy?" },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });
});
