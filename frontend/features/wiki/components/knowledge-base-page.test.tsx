import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockAskMutate = jest.fn();
const mockFeedbackMutate = jest.fn();
const mockCreateGapMutate = jest.fn();
const mockAskResetAttempt = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/knowledge/chat",
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: null }),
}));

jest.mock("@/hooks/api/kb/ask", () => ({
  ...jest.requireActual("@/hooks/api/kb/ask"),
  useKbAsk: () => ({
    mutate: mockAskMutate,
    isPending: false,
    isError: false,
    stop: jest.fn(),
    resetAttempt: mockAskResetAttempt,
  }),
  useKbAskPageOwners: () => ({ data: { pages: [] }, isLoading: false, hasNextPage: false, isFetchingNextPage: false, fetchNextPage: jest.fn(), error: null, refetch: jest.fn() }),
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

jest.mock("@/hooks/api/kb/page-collection", () => ({
  ...jest.requireActual("@/hooks/api/kb/page-collection"),
  useInfiniteKbPageCollection: () => ({
    data: { pages: [{ data: [], pagination: { limit: 50, nextCursor: null, hasMore: false } }] },
    isLoading: false,
    isError: false,
    error: null,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
    refetch: jest.fn(),
  }),
}));

jest.mock("@/hooks/api/kb/files", () => ({
  useUploadKbFile: () => ({ mutate: jest.fn(), isPending: false }),
}));

Object.assign(navigator, { clipboard: { writeText: jest.fn().mockResolvedValue(undefined) } });

import KnowledgeBasePage from "./knowledge-base-page";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";

function renderPage(): QueryClient {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <KnowledgeBasePage />
    </QueryClientProvider>,
  );
  return qc;
}

beforeEach(() => {
  mockAskMutate.mockReset();
  mockFeedbackMutate.mockReset();
  mockCreateGapMutate.mockReset();
  mockAskResetAttempt.mockReset();
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

describe("KnowledgeBasePage — Ask input height matches FIELD_CONTROL_CLASS (FE-102)", () => {
  it("renders the ask input with h-9 height so it is not oversized relative to other standard controls on the page", () => {
    renderPage();
    const input = screen.getByPlaceholderText(/ask anything/i);
    expect(input.className).toContain("h-9");
  });

  it("does not render the ask input with h-11 so the oversized input class that was breaking the layout is absent", () => {
    renderPage();
    const input = screen.getByPlaceholderText(/ask anything/i);
    expect(input.className).not.toContain("h-11");
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

describe("KnowledgeBasePage — completed answer presentation", () => {
  it.each([
    { state: "insufficient evidence", hasContext: false, disagreement: undefined, banner: /no relevant content found/i },
    { state: "source disagreement", hasContext: true, disagreement: { summary: "Two sources conflict." }, banner: /sources disagree/i },
  ])("does not retain a second streamed answer after $state is cached", async ({ hasContext, disagreement, banner }) => {
    mockAskMutate.mockImplementation((input, options) => {
      input.onToken("The answer needs review.");
      options.onSuccess({ hasContext, answer: "The answer needs review.", citations: [], conversationId: 9, disagreement });
    });
    const qc = renderPage();

    await userEvent.type(screen.getByPlaceholderText(/ask anything/i), "What is the policy?");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    const cached = qc.getQueryData<{ pages: Array<{ messages: Array<{ content: string }> }> }>(
      knowledgeAndSurveysQueryKeys.kb.chatConversationMessages(9),
    );
    expect(cached?.pages[0]?.messages[0]?.content).toBe("The answer needs review.");
    expect(screen.getByText(banner)).toBeInTheDocument();
    expect(screen.queryByText("The answer needs review.")).not.toBeInTheDocument();
  });
});

describe("KnowledgeBasePage — interrupted answer recovery", () => {
  it("labels streamed text as partial and withholds answer actions after Stop aborts generation", async () => {
    mockAskMutate.mockImplementation((input, options) => {
      input.onToken("Partial policy answer");
      options.onError(new DOMException("Generation stopped", "AbortError"));
    });
    renderPage();

    await userEvent.type(screen.getByPlaceholderText(/ask anything/i), "What is the policy?");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(screen.getByText("Partial policy answer")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Partial answer — generation did not complete.");
    expect(screen.getByText("Generation stopped. This answer is incomplete.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate a new answer" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /copy answer/i })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: /mark answer as helpful/i })).toHaveLength(1);
  });

  it("keeps a failed network answer marked partial and starts a fresh generation on retry", async () => {
    mockAskMutate.mockImplementationOnce((input, options) => {
      input.onToken("Partial network answer");
      options.onError(new Error("Connection lost"));
    });
    renderPage();

    await userEvent.type(screen.getByPlaceholderText(/ask anything/i), "What is the policy?");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(screen.getByText("Partial network answer")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Partial answer — generation did not complete.");
    expect(screen.getByText("Connection lost")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /copy answer/i })).toHaveLength(1);

    await userEvent.click(screen.getByRole("button", { name: "Generate a new answer" }));

    expect(mockAskResetAttempt).toHaveBeenCalledTimes(1);
    expect(mockAskMutate).toHaveBeenCalledTimes(2);
    expect(mockAskMutate.mock.calls[1]?.[0]).toEqual(expect.objectContaining({ question: "What is the policy?" }));
    expect(screen.queryByText("Partial network answer")).not.toBeInTheDocument();
  });
});
