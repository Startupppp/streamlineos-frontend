import { Component, type ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { ApiError } from "@/lib/api-envelope";
import { authenticatedScope } from "@/lib/query-scope";

const ORG_ID = "org-spaces-err";
const USER_ID = "user-spaces-err";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/knowledge/chat",
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: USER_ID }, orgId: ORG_ID } }),
}));

jest.mock("@/hooks/api/kb/ask", () => ({
  ...jest.requireActual("@/hooks/api/kb/ask"),
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

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useAccess: () => ({
    data: { permissions: ["kb:ai:generate"] },
    refetch: jest.fn(),
  }),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembers: () => ({
    data: { data: [], pagination: { limit: 100, nextCursor: null, hasMore: false } },
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

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    upload: jest.fn(),
  },
  isApiError: (error: unknown) => error instanceof Error && error.name === "ApiError",
}));

import { apiClient } from "@/lib/api-client";
import KnowledgeBasePage from "./knowledge-base-page";

const mockedGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

class CatchingBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return <p data-testid="boundary-fallback">boundary fallback</p>;
    }
    return this.props.children;
  }
}

function clientForTest(): QueryClient {
  const client = createAppQueryClient(authenticatedScope(ORG_ID, USER_ID));
  const defaults = client.getDefaultOptions();
  client.setDefaultOptions({
    ...defaults,
    queries: { ...defaults.queries, retry: false },
  });
  return client;
}

let consoleError: jest.SpyInstance;

beforeEach(() => {
  mockedGet.mockReset();
  mockedGet.mockRejectedValue(new ApiError("Service unavailable", 400));
  consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

it("keeps a spaces fetch 400 off the route boundary so the knowledge-base page stays up when useKbSpaces fails before data is cached — the failure the user sees as the page breaking when clicking Scope Files or Notes", async () => {
  const qc = clientForTest();

  render(
    <QueryClientProvider client={qc}>
      <CatchingBoundary>
        <KnowledgeBasePage />
      </CatchingBoundary>
    </QueryClientProvider>,
  );

  await waitFor(() => {
    const queries = qc.getQueryCache().getAll();
    expect(queries.some((q) => q.state.status === "error")).toBe(true);
  });

  expect(screen.queryByTestId("boundary-fallback")).not.toBeInTheDocument();
  expect(screen.getByText("Ask your knowledge base")).toBeInTheDocument();
});
