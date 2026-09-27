import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockAskMutate = jest.fn();
const mockPageSearch = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/knowledge/chat",
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "user-1" } } }),
}));

jest.mock("@/hooks/api/kb/ask", () => ({
  useKbAsk: () => ({
    mutate: mockAskMutate,
    isPending: false,
    isError: false,
    stop: jest.fn(),
    resetAttempt: jest.fn(),
  }),
  useKbAiAnswerFeedback: () => ({ mutate: jest.fn(), isPending: false }),
  useCreateKbKnowledgeGap: () => ({ mutate: jest.fn(), isPending: false }),
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
    data: { pages: [{ messages: [], nextCursor: null }] },
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

jest.mock("@/hooks/api/kb/spaces", () => ({
  useKbSpaces: () => ({
    data: { data: [], pagination: { limit: 50, nextCursor: null, hasMore: false } },
    isLoading: false,
  }),
}));

jest.mock("@/hooks/api/kb/pages", () => ({
  useKbPagesSearch: (q: string) => mockPageSearch(q),
}));

import KnowledgeBasePage from "./knowledge-base-page";

function renderPage(): void {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={qc}>
      <KnowledgeBasePage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockAskMutate.mockReset();
  mockPageSearch.mockReturnValue({
    data: undefined,
    isLoading: false,
  });
});

describe("KnowledgeBasePage — page picker in scope sheet", () => {
  it("renders the page search input when the scope sheet is opened", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /choose sources to search/i }));

    expect(await screen.findByRole("textbox", { name: /search pages/i })).toBeInTheDocument();
  });

  it("shows page search results when the hook returns items", async () => {
    mockPageSearch.mockReturnValue({
      data: {
        items: [
          { id: 10, title: "Onboarding Guide", icon: null, snippet: "How to onboard" },
        ],
        hasMore: false,
        limit: 20,
      },
      isLoading: false,
    });

    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /choose sources to search/i }));
    await screen.findByRole("textbox", { name: /search pages/i });

    expect(screen.getByText("Onboarding Guide")).toBeInTheDocument();
  });

  it("CONTROL: when the hook returns no items the page title is absent, proving the previous assertion is not a tautology", async () => {
    mockPageSearch.mockReturnValue({
      data: { items: [], hasMore: false, limit: 20 },
      isLoading: false,
    });

    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /choose sources to search/i }));
    await screen.findByRole("textbox", { name: /search pages/i });

    expect(screen.queryByText("Onboarding Guide")).not.toBeInTheDocument();
  });

  it("selecting a page and confirming sends it as pageIds in the ask request", async () => {
    mockPageSearch.mockReturnValue({
      data: {
        items: [
          { id: 10, title: "Onboarding Guide", icon: null, snippet: "How to onboard" },
        ],
        hasMore: false,
        limit: 20,
      },
      isLoading: false,
    });

    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /choose sources to search/i }));
    await screen.findByRole("checkbox", { name: /include onboarding guide in search/i });

    await userEvent.click(screen.getByRole("checkbox", { name: /include onboarding guide in search/i }));
    await userEvent.click(screen.getByRole("button", { name: /search 1 item/i }));

    const inputEl = screen.getByPlaceholderText(/ask anything/i);
    await userEvent.type(inputEl, "what is the leave policy");
    await userEvent.click(screen.getByRole("button", { name: /^send$/i }));

    expect(mockAskMutate).toHaveBeenCalledWith(
      expect.objectContaining({ pageIds: [10] }),
      expect.anything(),
    );
  });

  it("CONTROL: without selecting any page the ask request omits pageIds, proving the previous assertion is not a tautology", async () => {
    renderPage();

    const inputEl = screen.getByPlaceholderText(/ask anything/i);
    await userEvent.type(inputEl, "what is the leave policy");
    await userEvent.click(screen.getByRole("button", { name: /^send$/i }));

    expect(mockAskMutate).toHaveBeenCalledWith(
      expect.not.objectContaining({ pageIds: expect.anything() }),
      expect.anything(),
    );
  });

  it("clearing the scope removes the applied page ids from the next ask request", async () => {
    mockPageSearch.mockReturnValue({
      data: {
        items: [
          { id: 10, title: "Onboarding Guide", icon: null, snippet: "How to onboard" },
        ],
        hasMore: false,
        limit: 20,
      },
      isLoading: false,
    });

    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /choose sources to search/i }));
    await screen.findByRole("checkbox", { name: /include onboarding guide in search/i });

    await userEvent.click(screen.getByRole("checkbox", { name: /include onboarding guide in search/i }));
    await userEvent.click(screen.getByRole("button", { name: /search 1 item/i }));

    await userEvent.click(screen.getByRole("button", { name: /clear/i }));

    const inputEl = screen.getByPlaceholderText(/ask anything/i);
    await userEvent.type(inputEl, "what is the leave policy");
    await userEvent.click(screen.getByRole("button", { name: /^send$/i }));

    expect(mockAskMutate).toHaveBeenCalledWith(
      expect.not.objectContaining({ pageIds: expect.anything() }),
      expect.anything(),
    );
  });
});
