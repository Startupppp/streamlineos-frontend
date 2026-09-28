import { render, screen } from "@testing-library/react";
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
    data: {
      pages: [
        {
          data: [
            {
              id: 1,
              kind: "file",
              title: "Engineering Spec",
              spaceId: 10,
              status: "ready",
              chunkCount: 4,
              mimeType: null,
              fileSize: null,
              fileUrl: null,
              errorMessage: null,
              createdById: "user-1",
              createdAt: "2026-09-01T00:00:00.000Z",
            },
            {
              id: 2,
              kind: "note",
              title: "Marketing Playbook",
              spaceId: 20,
              status: "ready",
              chunkCount: 2,
              mimeType: null,
              fileSize: null,
              fileUrl: null,
              errorMessage: null,
              createdById: "user-2",
              createdAt: "2026-09-02T00:00:00.000Z",
            },
          ],
          pagination: { limit: 50, nextCursor: null, hasMore: false },
        },
      ],
    },
    isLoading: false,
  }),
  useUploadKbSource: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteKbSource: () => ({ mutate: jest.fn(), isPending: false, variables: undefined }),
  useCreateKbSourceNote: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/kb/spaces", () => ({
  useKbSpaces: () => ({
    data: {
      data: [
        { id: 10, name: "Engineering" },
        { id: 20, name: "Marketing" },
      ],
      pagination: { limit: 50, nextCursor: null, hasMore: false },
    },
    isLoading: false,
  }),
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
});

describe("KnowledgeBasePage — space filter in scope sheet", () => {
  it("shows space filter buttons when spaces are available", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /choose sources to search/i }));

    expect(await screen.findByRole("button", { name: "Engineering" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Marketing" })).toBeInTheDocument();
  });

  it("shows all sources initially before any space filter is applied", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /choose sources to search/i }));

    expect(await screen.findByText("Engineering Spec")).toBeInTheDocument();
    expect(screen.getByText("Marketing Playbook")).toBeInTheDocument();
  });

  it("hides sources outside the selected space when a space filter is applied", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /choose sources to search/i }));
    await screen.findByRole("button", { name: "Engineering" });

    await userEvent.click(screen.getByRole("button", { name: "Engineering" }));

    expect(screen.queryByText("Marketing Playbook")).not.toBeInTheDocument();
  });

  it("still shows sources from the selected space when a space filter is applied", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /choose sources to search/i }));
    await screen.findByRole("button", { name: "Engineering" });

    await userEvent.click(screen.getByRole("button", { name: "Engineering" }));

    expect(screen.getByText("Engineering Spec")).toBeInTheDocument();
  });

  it("shows only the new space's sources when switching from one space filter to another", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /choose sources to search/i }));
    await screen.findByRole("button", { name: "Engineering" });
    await userEvent.click(screen.getByRole("button", { name: "Engineering" }));
    expect(screen.queryByText("Marketing Playbook")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Marketing" }));

    expect(screen.getByText("Marketing Playbook")).toBeInTheDocument();
    expect(screen.queryByText("Engineering Spec")).not.toBeInTheDocument();
  });
});
