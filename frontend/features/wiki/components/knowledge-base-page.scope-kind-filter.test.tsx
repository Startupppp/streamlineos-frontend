import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockAskMutate = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/knowledge/chat",
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "user-1" } } }),
}));

jest.mock("@/hooks/api/kb/ask", () => ({
  ...jest.requireActual("@/hooks/api/kb/ask"),
  useKbAsk: () => ({
    mutate: mockAskMutate,
    isPending: false,
    isError: false,
    stop: jest.fn(),
    resetAttempt: jest.fn(),
  }),
  useKbAskPageOwners: () => ({ data: { pages: [] }, isLoading: false, hasNextPage: false, isFetchingNextPage: false, fetchNextPage: jest.fn(), error: null, refetch: jest.fn() }),
  useKbAiAnswerFeedback: () => ({ mutate: jest.fn(), isPending: false }),
  useCreateKbKnowledgeGap: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useAccess: () => ({ data: { permissions: ["kb:ai:generate"] }, refetch: jest.fn() }),
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

const FILE_SOURCE = {
  id: 1, kind: "file", title: "Spec Doc", spaceId: null, status: "published",
  createdById: "user-1", createdAt: "2026-09-01T00:00:00.000Z",
};

const mockUseInfiniteKbPageCollection = jest.fn();

jest.mock("@/hooks/api/kb/page-collection", () => ({
  ...jest.requireActual("@/hooks/api/kb/page-collection"),
  useInfiniteKbPageCollection: (...args: unknown[]) => mockUseInfiniteKbPageCollection(...args),
}));

jest.mock("@/hooks/api/kb/files", () => ({
  useUploadKbFile: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/kb/spaces", () => ({
  useKbSpaces: () => ({
    data: { data: [], pagination: { limit: 50, nextCursor: null, hasMore: false } },
    isLoading: false,
  }),
}));

jest.mock("@/hooks/api/kb/pages", () => ({
  ...jest.requireActual("@/hooks/api/kb/pages"),
  useKbPagesSearch: () => ({ data: { items: [] }, isLoading: false }),
}));

import KnowledgeBasePage from "./knowledge-base-page";

function fileOnlyPage() {
  return {
    data: {
      pages: [{ data: [FILE_SOURCE], pagination: { limit: 50, nextCursor: null, hasMore: false } }],
    },
    isLoading: false,
    isError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
    refetch: jest.fn(),
    error: null,
  };
}

function emptyPage() {
  return {
    data: { pages: [{ data: [], pagination: { limit: 50, nextCursor: null, hasMore: false } }] },
    isLoading: false,
    isError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
    refetch: jest.fn(),
    error: null,
  };
}

function renderWithNoFiles() {
  mockUseInfiniteKbPageCollection.mockImplementation(() => emptyPage());
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={qc}>
      <KnowledgeBasePage />
    </QueryClientProvider>,
  );
  return userEvent.setup({ pointerEventsCheck: 0 });
}

function renderWithFilesOnly() {
  mockUseInfiniteKbPageCollection.mockImplementation(() => fileOnlyPage());
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={qc}>
      <KnowledgeBasePage />
    </QueryClientProvider>,
  );
  return userEvent.setup({ pointerEventsCheck: 0 });
}

beforeEach(() => {
  mockAskMutate.mockReset();
  mockUseInfiniteKbPageCollection.mockReset();
});

describe("KnowledgeBasePage source pagination wiring", () => {
  it("requests the next source page from the active scope query", async () => {
    const fetchNextPage = jest.fn();
    mockUseInfiniteKbPageCollection.mockImplementation(() => ({
      ...emptyPage(),
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage,
    }));
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(
      <QueryClientProvider client={qc}>
        <KnowledgeBasePage />
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: /choose sources to search/i }));
    await user.click(screen.getByRole("button", { name: "Load more sources" }));
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });
});

describe("KnowledgeBasePage — kind filter with empty results does not send an empty pageIds array (FE-183)", () => {
  it("omits pageIds entirely when there are no file pages, the user confirms, then sends — an empty pageIds array would be rejected with 400 by the backend askSchema min(1) constraint", async () => {
    const user = renderWithNoFiles();

    await user.click(screen.getByRole("button", { name: /choose sources to search/i }));
    await screen.findByRole("button", { name: /search all sources and files/i });

    await user.click(screen.getByRole("button", { name: /search all sources and files/i }));

    await user.type(
      screen.getByPlaceholderText(/ask anything/i),
      "What file exists?",
    );
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(mockAskMutate).toHaveBeenCalled());
    const body = mockAskMutate.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(Object.keys(body)).not.toContain("pageIds");
  });

  it("omits pageIds entirely when the user confirms without selecting any file, then sends (CONTROL: confirms the previous test is not vacuous)", async () => {
    const user = renderWithFilesOnly();

    await user.click(screen.getByRole("button", { name: /choose sources to search/i }));
    await screen.findByRole("button", { name: /search all sources and files/i });

    await user.click(screen.getByRole("button", { name: /search all sources and files/i }));

    await user.type(
      screen.getByPlaceholderText(/ask anything/i),
      "What notes exist?",
    );
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(mockAskMutate).toHaveBeenCalled());
    const body = mockAskMutate.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(Object.keys(body)).not.toContain("pageIds");
  });

  it("does send pageIds when a file page is selected, confirmed, and sent — proves the negative tests above are not vacuously passing because the selection path is reachable", async () => {
    const user = renderWithFilesOnly();

    await user.click(screen.getByRole("button", { name: /choose sources to search/i }));
    await screen.findByRole("button", { name: /search all sources and files/i });

    await user.click(screen.getByRole("checkbox", { name: /include spec doc in search/i }));

    await user.click(screen.getByRole("button", { name: /^Search 1 item/i }));

    await user.type(
      screen.getByPlaceholderText(/ask anything/i),
      "What file exists?",
    );
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(mockAskMutate).toHaveBeenCalled());
    const body = mockAskMutate.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(body).toHaveProperty("pageIds", [1]);
  });
});
