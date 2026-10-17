import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * CHAT-003. The sidebar's "Messages" scope filtered the loaded conversation list by
 * channel name and by the one `lastMessage` preview each row carries, so a term that
 * was in the history but not in the newest line answered "No conversations match your
 * search" over a conversation that plainly contained it.
 *
 * These tests name the three cases separately, because the preview match passing is
 * what hid the missing one: a term in the newest message always worked.
 */

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/chat",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
    data: { orgId: "org-1", user: { id: "user-1" } },
    status: "authenticated",
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  isApiError: () => false,
  getApiErrorCode: () => undefined,
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(() => ({ data: { scopes: {}, modules: {} }, refetch: jest.fn() })),
  useCan: jest.fn(() => true),
  useModuleEnabled: jest.fn().mockReturnValue(true),
}));

const { apiClient } = jest.requireMock("@/lib/api-client") as {
  apiClient: { get: jest.Mock };
};

const CHANNEL = {
  id: 40,
  name: "QA Fictional Tester",
  type: "DIRECT",
  avatarUrl: null,
  isArchived: false,
  entityType: null,
  entityId: null,
  unreadCount: 0,
  memberCount: 1,
  membersTruncated: false,
  members: [
    {
      id: 1,
      channelId: 40,
      userId: "user-1",
      role: "ADMIN",
      mutedUntil: null,
      isFavorite: false,
      notificationPreference: "DEFAULT",
      user: { id: "user-1", name: "QA Fictional Tester", image: null },
    },
  ],
  lastMessage: {
    id: 48,
    content: "CHAT-QA-009 restore hidden self fixture",
    createdAt: "2026-10-01T09:00:00.000Z",
    senderId: "user-1",
  },
};

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

async function renderSidebar() {
  const { ChannelSidebar } = await import("@/features/chat/channel-sidebar");
  return render(
    <Wrapper>
      <ChannelSidebar
        activeChannelId={null}
        onSelectChannel={jest.fn()}
        currentUserId="user-1"
      />
    </Wrapper>,
  );
}

function mockApi({ searchHits }: { searchHits: number[] }) {
  apiClient.get.mockImplementation(async (path: string) => {
    if (path === "/chat/channels") return { channels: [CHANNEL], nextCursor: null };
    if (path.startsWith("/chat/channels/archived"))
      return { channels: [], nextCursor: null };
    if (path === "/chat/search/messages")
      return {
        results: searchHits.map((channelId, index) => ({
          id: 100 + index,
          orgId: "org-1",
          channelId,
          senderMembershipId: 1,
          content: "CHAT-QA-002 line one",
          isEdited: false,
          isDeleted: false,
          messageType: "text",
          channelPosition: index + 1,
          createdAt: "2026-10-01T08:00:00.000Z",
        })),
        nextCursor: undefined,
      };
    return [];
  });
}

async function search(term: string) {
  const user = userEvent.setup();
  await renderSidebar();
  const input = await screen.findByLabelText("Search conversations");
  await user.type(input, term);
  return user;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("chat sidebar — searching message content", () => {
  it("finds the conversation when only an older message contains the term", async () => {
    mockApi({ searchHits: [40] });

    await search("CHAT-QA-002");

    expect(
      await screen.findByText("QA Fictional Tester"),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith(
        "/chat/search/messages",
        { q: "CHAT-QA-002" },
        expect.anything(),
        expect.anything(),
      ),
    );
  });

  it("still finds the conversation from its latest preview, with no server hit needed", async () => {
    mockApi({ searchHits: [] });

    await search("CHAT-QA-009");

    expect(await screen.findByText("QA Fictional Tester")).toBeInTheDocument();
  });

  it("reports no match when neither the preview nor message search finds the term", async () => {
    mockApi({ searchHits: [] });

    await search("nothing-in-here");

    expect(
      await screen.findByText("No conversations match your search."),
    ).toBeInTheDocument();
  });
});
