import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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

const mockJoin = jest.fn();
const mockCreateDM = jest.fn();

jest.mock("@/hooks/api/chat-core-mutations-b", () => ({
  useJoinChannel: () => ({ mutateAsync: mockJoin, isPending: false }),
  useCreateDMChannel: () => ({ mutateAsync: mockCreateDM, isPending: false }),
}));

jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

const { apiClient } = jest.requireMock("@/lib/api-client") as {
  apiClient: { get: jest.Mock };
};

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const MESSAGE_HIT = {
  id: 100,
  orgId: "org-1",
  channelId: 40,
  senderMembershipId: 1,
  content: "CHAT-QA-002 line one",
  isEdited: false,
  isDeleted: false,
  messageType: "text",
  channelPosition: 1,
  createdAt: "2026-10-01T08:00:00.000Z",
  updatedAt: "2026-10-01T08:00:00.000Z",
  senderId: "user-2",
  sender: { id: "user-2", name: "Grace Hopper", image: null },
  reactions: {},
  attachments: [],
  channel: { id: 40, name: "design", type: "PUBLIC" },
};

function mockApi() {
  apiClient.get.mockImplementation(async (path: string) => {
    if (path === "/chat/channels" || path.startsWith("/chat/channels/archived"))
      return { channels: [], nextCursor: null };
    if (path === "/chat/channels/public")
      return {
        channels: [
          {
            id: 77,
            name: "announcements",
            description: null,
            avatarUrl: null,
            type: "PUBLIC",
            memberCount: 12,
            isMember: false,
            createdAt: null,
            lastMessageAt: null,
          },
        ],
        nextCursor: null,
      };
    if (path === "/chat/search/messages") return { results: [MESSAGE_HIT] };
    if (path === "/chat/search/channels")
      return [
        { id: 55, name: "design-crit", type: "PUBLIC", description: null, avatarUrl: null, isMember: false },
      ];
    if (path === "/chat/search/users")
      return [{ id: "user-2", name: "Grace Hopper", email: "grace@example.com", image: null }];
    return [];
  });
}

interface RenderOptions {
  scope: "messages" | "channels" | "people";
}

async function renderSearch({ scope }: RenderOptions) {
  const { ChannelSidebar } = await import("@/features/chat/channel-sidebar");
  const handlers = {
    onSelectChannel: jest.fn(),
    onOpenMessage: jest.fn(),
    onSearchScopeChange: jest.fn(),
    onCreateDialogChange: jest.fn(),
  };
  render(
    <Wrapper>
      <ChannelSidebar
        activeChannelId={null}
        currentUserId="user-1"
        createDialog={null}
        searchScope={scope}
        {...handlers}
      />
    </Wrapper>,
  );
  return handlers;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockApi();
});

describe("unified chat search — every result is actionable", () => {
  it("a message result opens its conversation at that exact message", async () => {
    const user = userEvent.setup();
    const handlers = await renderSearch({ scope: "messages" });

    await user.type(await screen.findByRole("textbox", { name: "Search terms" }), "CHAT-QA-002");
    await user.click(await screen.findByText("CHAT-QA-002 line one"));

    expect(handlers.onOpenMessage).toHaveBeenCalledWith(40, 100);
    expect(handlers.onSelectChannel).not.toHaveBeenCalled();
  });

  it("a non-member public channel is joined before it opens", async () => {
    const user = userEvent.setup();
    mockJoin.mockResolvedValue({ ok: true });
    const handlers = await renderSearch({ scope: "channels" });

    await user.type(await screen.findByRole("textbox", { name: "Search terms" }), "design");
    await user.click(await screen.findByRole("button", { name: "Join and open design-crit" }));

    await waitFor(() => expect(handlers.onSelectChannel).toHaveBeenCalledWith(55));
    expect(mockJoin).toHaveBeenCalledWith(55);
    expect(mockJoin.mock.invocationCallOrder[0]).toBeLessThan(
      handlers.onSelectChannel.mock.invocationCallOrder[0],
    );
  });

  it("does not open a channel whose join failed", async () => {
    const user = userEvent.setup();
    mockJoin.mockRejectedValue(new Error("Forbidden"));
    const handlers = await renderSearch({ scope: "channels" });

    await user.type(await screen.findByRole("textbox", { name: "Search terms" }), "design");
    await user.click(await screen.findByRole("button", { name: "Join and open design-crit" }));

    await waitFor(() => expect(mockJoin).toHaveBeenCalled());
    expect(handlers.onSelectChannel).not.toHaveBeenCalled();
  });

  it("with no query, the Channels tab browses public channels (the old /chat/channels page)", async () => {
    const user = userEvent.setup();
    mockJoin.mockResolvedValue({ ok: true });
    const handlers = await renderSearch({ scope: "channels" });

    await user.click(await screen.findByRole("button", { name: "Join and open announcements" }));
    await waitFor(() => expect(handlers.onSelectChannel).toHaveBeenCalledWith(77));
  });

  it("a person result opens or creates the direct message and selects it", async () => {
    const user = userEvent.setup();
    mockCreateDM.mockResolvedValue({ id: 91 });
    const handlers = await renderSearch({ scope: "people" });

    await user.type(await screen.findByRole("textbox", { name: "Search terms" }), "grace");
    await user.click(await screen.findByRole("button", { name: "Message Grace Hopper" }));

    await waitFor(() => expect(handlers.onSelectChannel).toHaveBeenCalledWith(91));
    expect(mockCreateDM).toHaveBeenCalledWith({ targetUserId: "user-2" });
  });

  it("switching tabs writes the scope back to its owner instead of holding a local copy", async () => {
    const user = userEvent.setup();
    const handlers = await renderSearch({ scope: "messages" });

    await user.click(await screen.findByRole("tab", { name: "People" }));
    expect(handlers.onSearchScopeChange).toHaveBeenCalledWith("people");
  });
});
