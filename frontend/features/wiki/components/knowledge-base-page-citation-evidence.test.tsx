import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const FIVE_DAYS_AGO = new Date(Date.now() - 5 * 86_400_000).toISOString();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/knowledge/chat",
}));

jest.mock("@/hooks/api/kb/ask", () => ({
  useKbAsk: () => ({
    mutate: jest.fn(),
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
    data: {
      pages: [
        {
          messages: [
            {
              id: 2,
              role: "assistant",
              content: "You get twenty days of leave.",
              citations: [
                {
                  kind: "page",
                  pageId: 41,
                  title: "Leave policy",
                  spaceId: 3,
                  updatedAt: FIVE_DAYS_AGO,
                  passage: "Full-time employees accrue twenty days of paid leave each year.",
                  verified: true,
                },
                {
                  kind: "page",
                  pageId: 42,
                  title: "Unreviewed draft",
                  spaceId: 3,
                  updatedAt: FIVE_DAYS_AGO,
                },
              ],
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

import KnowledgeBasePage from "./knowledge-base-page";

function renderPage(): void {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <KnowledgeBasePage />
    </QueryClientProvider>,
  );
}

describe("Ask KB answer parts are mounted on a cited answer", () => {
  it("renders the cited source passage so the answer is not uncited prose", () => {
    renderPage();
    expect(
      screen.getByText(/Full-time employees accrue twenty days of paid leave each year\./),
    ).toBeInTheDocument();
  });

  it("renders a freshness label derived from the citation updatedAt", () => {
    renderPage();
    expect(screen.getAllByLabelText("Updated 5d ago").length).toBeGreaterThan(0);
  });

  it("renders the verification badge for a verified citation", () => {
    renderPage();
    expect(screen.getAllByLabelText("Verified source").length).toBe(1);
  });

  it("shows no passage and no verification badge for an unverified citation without a passage (positive pair)", () => {
    renderPage();
    expect(screen.queryByText(/Unreviewed draft passage/)).not.toBeInTheDocument();
    expect(screen.getAllByLabelText("Verified source").length).toBe(1);
  });
});
