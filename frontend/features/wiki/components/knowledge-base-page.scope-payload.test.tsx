import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockStreamAiResult = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/knowledge/chat",
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "user-1" } } }),
}));

jest.mock("@/hooks/api/ai-result-stream", () => ({
  streamAiResult: (...args: unknown[]) => mockStreamAiResult(...args),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useAccess: () => ({ data: { permissions: ["kb:ai:generate"] }, refetch: jest.fn() }),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembers: () => ({
    data: {
      data: [
        { membershipId: 77, userId: "user-1", role: "MEMBER", joinedAt: "2026-01-01T00:00:00.000Z", name: "Ada Lovelace", email: "ada@example.com", image: null, totpEnabled: false },
        { membershipId: 88, userId: "user-2", role: "MEMBER", joinedAt: "2026-01-01T00:00:00.000Z", name: "Grace Hopper", email: "grace@example.com", image: null, totpEnabled: false },
      ],
      pagination: { limit: 100, nextCursor: null, hasMore: false },
    },
    isLoading: false,
  }),
}));

jest.mock("@/hooks/api/kb/chat-history", () => ({
  useKbConversations: () => ({ data: { pages: [] }, hasNextPage: false, isFetchingNextPage: false, fetchNextPage: jest.fn() }),
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

const READY_SOURCE = {
  id: 1, kind: "file", title: "Engineering Spec", spaceId: 10, status: "ready",
  chunkCount: 4, mimeType: null, fileSize: null, fileUrl: null, errorMessage: null,
  createdById: "user-1", createdAt: "2026-09-01T00:00:00.000Z",
};

jest.mock("@/hooks/api/kb/sources", () => ({
  useKbSources: () => ({
    data: { pages: [{ data: [READY_SOURCE], pagination: { limit: 50, nextCursor: null, hasMore: false } }] },
    isLoading: false,
  }),
  useUploadKbSource: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteKbSource: () => ({ mutate: jest.fn(), isPending: false, variables: undefined }),
  useCreateKbSourceNote: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/kb/spaces", () => ({
  useKbSpaces: () => ({
    data: {
      data: [{ id: 10, name: "Engineering" }, { id: 20, name: "Marketing" }],
      pagination: { limit: 50, nextCursor: null, hasMore: false },
    },
    isLoading: false,
  }),
}));

jest.mock("@/hooks/api/kb/pages", () => ({
  useKbPagesSearch: () => ({
    data: { items: [{ id: 5, title: "Onboarding Guide" }] },
    isLoading: false,
  }),
}));

import KnowledgeBasePage from "./knowledge-base-page";

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <KnowledgeBasePage />
    </QueryClientProvider>,
  );
  return userEvent.setup({ pointerEventsCheck: 0 });
}

/** The object `streamAiResult` was handed as the POST body for /kb/ask/stream. */
async function sentBody(): Promise<Record<string, unknown>> {
  await waitFor(() => expect(mockStreamAiResult).toHaveBeenCalled());
  const request = mockStreamAiResult.mock.calls[0][0] as { body: Record<string, unknown> };
  return request.body;
}

async function openScopeSheet(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /choose sources to search/i }));
  await screen.findByRole("button", { name: /search all sources and pages|^Search \d+ item/i });
}

async function confirmAndAsk(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /search all sources and pages|^Search \d+ item/i }));
  await user.type(screen.getByPlaceholderText(/ask anything/i), "What is the policy?");
  await user.click(screen.getByRole("button", { name: "Send" }));
}

beforeEach(() => {
  mockStreamAiResult.mockReset();
  mockStreamAiResult.mockResolvedValue({
    answer: "Twenty days.", citations: [], hasContext: true, conversationId: 9,
  });
});

describe("KnowledgeBasePage — every scope dimension the sheet edits reaches the ask request body", () => {
  it("sends status when the status control is set, because a control that renders without reaching the payload scopes nothing", async () => {
    const user = renderPage();
    await openScopeSheet(user);

    await user.click(screen.getByRole("button", { name: "Draft" }));
    await confirmAndAsk(user);

    expect(await sentBody()).toHaveProperty("status", "draft");
  });

  it("omits status entirely when the status control is left on Any, rather than sending an undefined that vanishes in JSON", async () => {
    const user = renderPage();
    await openScopeSheet(user);
    await confirmAndAsk(user);

    expect(Object.keys(await sentBody())).not.toContain("status");
  });

  it("sends ownerMembershipId as the member's numeric membership id when an owner is picked", async () => {
    const user = renderPage();
    await openScopeSheet(user);

    await user.click(screen.getByRole("combobox", { name: /restrict answer to pages owned by a member/i }));
    await user.click(await screen.findByText("Grace Hopper"));
    await confirmAndAsk(user);

    expect(await sentBody()).toHaveProperty("ownerMembershipId", 88);
  });

  it("omits ownerMembershipId when no owner is picked", async () => {
    const user = renderPage();
    await openScopeSheet(user);
    await confirmAndAsk(user);

    expect(Object.keys(await sentBody())).not.toContain("ownerMembershipId");
  });

  it("sends spaceId when a space is chosen, which the space control previously filtered the list by without ever scoping the answer", async () => {
    const user = renderPage();
    await openScopeSheet(user);

    await user.click(screen.getByRole("button", { name: "Engineering" }));
    await confirmAndAsk(user);

    expect(await sentBody()).toHaveProperty("spaceId", 10);
  });

  it("omits spaceId when the space control is left on All", async () => {
    const user = renderPage();
    await openScopeSheet(user);
    await confirmAndAsk(user);

    expect(Object.keys(await sentBody())).not.toContain("spaceId");
  });

  it("sends verifiedOnly when the verified toggle is on", async () => {
    const user = renderPage();
    await openScopeSheet(user);

    await user.click(screen.getByRole("switch", { name: /verified sources only/i }));
    await confirmAndAsk(user);

    expect(await sentBody()).toHaveProperty("verifiedOnly", true);
  });

  it("omits verifiedOnly when the verified toggle is off", async () => {
    const user = renderPage();
    await openScopeSheet(user);
    await confirmAndAsk(user);

    expect(Object.keys(await sentBody())).not.toContain("verifiedOnly");
  });

  it("sends sourceIds for a file or note ticked in the sources list", async () => {
    const user = renderPage();
    await openScopeSheet(user);

    await user.click(screen.getByRole("checkbox", { name: /include engineering spec in search/i }));
    await confirmAndAsk(user);

    expect(await sentBody()).toHaveProperty("sourceIds", [1]);
  });

  it("sends pageIds for a wiki page ticked in the page picker", async () => {
    const user = renderPage();
    await openScopeSheet(user);

    await user.click(screen.getByRole("checkbox", { name: /include onboarding guide in search/i }));
    await confirmAndAsk(user);

    expect(await sentBody()).toHaveProperty("pageIds", [5]);
  });

  it("omits sourceIds and pageIds when nothing is ticked", async () => {
    const user = renderPage();
    await openScopeSheet(user);
    await confirmAndAsk(user);

    const keys = Object.keys(await sentBody());
    expect(keys).not.toContain("sourceIds");
    expect(keys).not.toContain("pageIds");
  });

  it("carries all six dimensions together in one request, so no dimension overwrites another on the way to the body", async () => {
    const user = renderPage();
    await openScopeSheet(user);

    await user.click(screen.getByRole("button", { name: "Published" }));
    await user.click(screen.getByRole("button", { name: "Engineering" }));
    await user.click(screen.getByRole("switch", { name: /verified sources only/i }));
    await user.click(screen.getByRole("checkbox", { name: /include engineering spec in search/i }));
    await user.click(screen.getByRole("checkbox", { name: /include onboarding guide in search/i }));
    await user.click(screen.getByRole("combobox", { name: /restrict answer to pages owned by a member/i }));
    await user.click(await screen.findByText("Ada Lovelace"));
    await confirmAndAsk(user);

    expect(await sentBody()).toMatchObject({
      question: "What is the policy?",
      status: "published",
      spaceId: 10,
      verifiedOnly: true,
      sourceIds: [1],
      pageIds: [5],
      ownerMembershipId: 77,
    });
  });
});
