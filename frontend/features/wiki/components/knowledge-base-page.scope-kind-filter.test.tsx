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
  useKbAiAnswerFeedback: () => ({ mutate: jest.fn(), isPending: false }),
  useCreateKbKnowledgeGap: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useAccess: () => ({ data: { permissions: ["kb:ai:generate"] }, refetch: jest.fn() }),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembers: () => ({
    data: {
      data: [],
      pagination: { limit: 100, nextCursor: null, hasMore: false },
    },
    isLoading: false,
  }),
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
  id: 1, kind: "file", title: "Spec Doc", spaceId: null, status: "ready",
  chunkCount: 3, mimeType: null, fileSize: null, fileUrl: null, errorMessage: null,
  createdById: "user-1", createdAt: "2026-09-01T00:00:00.000Z",
};

const NOTE_SOURCE = {
  id: 2, kind: "note", title: "My Meeting Notes", spaceId: null, status: "ready",
  chunkCount: 2, mimeType: null, fileSize: null, fileUrl: null, errorMessage: null,
  createdById: "user-1", createdAt: "2026-09-01T00:00:00.000Z",
};

const mockUseKbSources = jest.fn();

jest.mock("@/hooks/api/kb/sources", () => ({
  useKbSources: (...args: unknown[]) => mockUseKbSources(...args),
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
  useKbPagesSearch: () => ({ data: { items: [] }, isLoading: false }),
}));

import KnowledgeBasePage from "./knowledge-base-page";

function notesOnlyPage() {
  return {
    data: {
      pages: [{ data: [NOTE_SOURCE], pagination: { limit: 50, nextCursor: null, hasMore: false } }],
    },
    isLoading: false,
    isError: false,
  };
}

function fileOnlyPage() {
  return {
    data: {
      pages: [{ data: [FILE_SOURCE], pagination: { limit: 50, nextCursor: null, hasMore: false } }],
    },
    isLoading: false,
    isError: false,
  };
}

function emptyPage() {
  return {
    data: { pages: [{ data: [], pagination: { limit: 50, nextCursor: null, hasMore: false } }] },
    isLoading: false,
    isError: false,
  };
}

function renderWithNotesOnly() {
  mockUseKbSources.mockImplementation((filters?: { kind?: string }) => {
    if (filters?.kind === "file") return emptyPage();
    if (filters?.kind === "note") return notesOnlyPage();
    return notesOnlyPage();
  });
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
  mockUseKbSources.mockImplementation((filters?: { kind?: string }) => {
    if (filters?.kind === "note") return emptyPage();
    if (filters?.kind === "file") return fileOnlyPage();
    return fileOnlyPage();
  });
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
  mockUseKbSources.mockReset();
});

describe("KnowledgeBasePage — kind filter with empty results does not send an empty sourceIds array (FE-183)", () => {
  it("omits sourceIds entirely when the user switches to the Files kind filter with no file sources, confirms, then sends — an empty sourceIds array would be rejected with 400 by the backend askSchema min(1) constraint", async () => {
    const user = renderWithNotesOnly();

    await user.click(screen.getByRole("button", { name: /choose sources to search/i }));
    await screen.findByRole("button", { name: /search all sources and pages/i });

    await user.click(screen.getByRole("button", { name: "Files" }));

    await user.click(screen.getByRole("button", { name: /search all sources and pages/i }));

    await user.type(
      screen.getByPlaceholderText(/ask anything/i),
      "What file exists?",
    );
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(mockAskMutate).toHaveBeenCalled());
    const body = mockAskMutate.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(Object.keys(body)).not.toContain("sourceIds");
  });

  it("omits sourceIds entirely when the user switches to the Notes kind filter with no note sources, confirms, then sends — an empty sourceIds array would be rejected with 400 by the backend askSchema min(1) constraint (CONTROL: this test is the positive counterpart that proves the negative above is not vacuous)", async () => {
    const user = renderWithFilesOnly();

    await user.click(screen.getByRole("button", { name: /choose sources to search/i }));
    await screen.findByRole("button", { name: /search all sources and pages/i });

    await user.click(screen.getByRole("button", { name: "Notes" }));

    await user.click(screen.getByRole("button", { name: /search all sources and pages/i }));

    await user.type(
      screen.getByPlaceholderText(/ask anything/i),
      "What notes exist?",
    );
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(mockAskMutate).toHaveBeenCalled());
    const body = mockAskMutate.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(Object.keys(body)).not.toContain("sourceIds");
  });

  it("does send sourceIds when the user switches to the Files kind filter that has a file, selects it, confirms, and sends — proves the negative tests above are not vacuously passing because the selection path is reachable", async () => {
    const user = renderWithFilesOnly();

    await user.click(screen.getByRole("button", { name: /choose sources to search/i }));
    await screen.findByRole("button", { name: /search all sources and pages/i });

    await user.click(screen.getByRole("button", { name: "Files" }));

    await user.click(screen.getByRole("checkbox", { name: /include spec doc in search/i }));

    await user.click(screen.getByRole("button", { name: /^Search 1 item/i }));

    await user.type(
      screen.getByPlaceholderText(/ask anything/i),
      "What file exists?",
    );
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(mockAskMutate).toHaveBeenCalled());
    const body = mockAskMutate.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(body).toHaveProperty("sourceIds", [1]);
  });
});
