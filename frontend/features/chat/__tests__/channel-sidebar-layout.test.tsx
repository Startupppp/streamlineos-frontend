import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
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

jest.mock("@/features/chat/new-dm-dialog", () => ({
  NewDMDialog: () => <div data-testid="new-dm-dialog" />,
}));

jest.mock("@/features/chat/new-group-dialog", () => ({
  NewGroupDialog: () => <div data-testid="new-group-dialog" />,
}));

const { apiClient } = jest.requireMock("@/lib/api-client") as {
  apiClient: { get: jest.Mock };
};

function member(isFavorite: boolean) {
  return [
    {
      id: 1,
      userId: "user-1",
      role: "MEMBER",
      mutedUntil: null,
      isFavorite,
      notificationPreference: "DEFAULT",
      user: { id: "user-1", name: "Me", image: null },
    },
  ];
}

function channel(id: number, name: string, type: string, isFavorite = false) {
  return {
    id,
    name,
    type,
    avatarUrl: null,
    isArchived: false,
    entityType: null,
    entityId: null,
    unreadCount: 0,
    memberCount: 1,
    membersTruncated: false,
    members: member(isFavorite),
    lastMessage: null,
  };
}

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

async function renderSidebar(
  channels: unknown[],
  over: { createDialog?: "dm" | "channel" | null } = {},
) {
  apiClient.get.mockImplementation(async (path: string) =>
    path === "/chat/channels"
      ? { channels, nextCursor: null }
      : path.startsWith("/chat/channels")
        ? { channels: [], nextCursor: null }
        : [],
  );
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
        createDialog={over.createDialog ?? null}
        searchScope={null}
        {...handlers}
      />
    </Wrapper>,
  );
  return handlers;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("chat sidebar — Starred plus one Conversations list", () => {
  it("lists starred conversations first and every other conversation in one list, whatever its type", async () => {
    await renderSidebar([
      channel(1, "design", "PUBLIC"),
      channel(2, "roadmap", "PUBLIC", true),
      channel(3, "leads", "PRIVATE"),
      channel(4, "crew", "GROUP"),
      channel(5, "dm", "DIRECT"),
    ]);

    const starred = await screen.findByRole("list", { name: "Starred" });
    expect(within(starred).getByText("roadmap")).toBeInTheDocument();
    expect(within(starred).getAllByRole("listitem")).toHaveLength(1);

    const conversations = screen.getAllByRole("list", { name: "Conversations" });
    const fullList = conversations[conversations.length - 1];
    expect(within(fullList).getAllByRole("listitem")).toHaveLength(4);
    for (const name of ["design", "leads", "crew"]) {
      expect(within(fullList).getByText(name)).toBeInTheDocument();
    }
    expect(within(fullList).queryByText("roadmap")).toBeNull();
    expect(
      screen.queryByRole("button", { name: /public channels|direct messages|groups|favorites/i }),
    ).toBeNull();
  });

  it("an authorized reader with no conversations gets the empty state", async () => {
    await renderSidebar([]);
    expect(await screen.findByText("No conversations yet")).toBeInTheDocument();
  });
});

describe("chat sidebar — one New menu, one search entry, no collapsible chrome", () => {
  it("has a single search entry that opens the unified search, and no scope tabs", async () => {
    const handlers = await renderSidebar([]);
    const user = userEvent.setup();

    const entries = screen.getAllByRole("button", { name: /search/i });
    expect(entries).toHaveLength(1);
    await user.click(entries[0]);
    expect(handlers.onSearchScopeChange).toHaveBeenCalledWith("messages");
    expect(screen.queryByRole("radiogroup", { name: "Search in" })).toBeNull();
  });

  it("has no header collapse control that could hide search and filters", async () => {
    await renderSidebar([]);
    expect(screen.queryByRole("button", { name: /collapse header|expand header/i })).toBeNull();
  });

  it("the New menu routes into the owner's dialog state", async () => {
    const handlers = await renderSidebar([]);
    const user = userEvent.setup();

    const newButtons = screen.getAllByRole("button", { name: /^new$/i });
    expect(newButtons).toHaveLength(1);
    await user.click(newButtons[0]);
    await user.click(await screen.findByRole("menuitem", { name: "New message" }));
    expect(handlers.onCreateDialogChange).toHaveBeenCalledWith("dm");
  });

  it("mounts exactly one New DM dialog when asked to", async () => {
    await renderSidebar([], { createDialog: "dm" });
    expect(await screen.findAllByTestId("new-dm-dialog")).toHaveLength(1);
    expect(screen.queryByTestId("new-group-dialog")).toBeNull();
  });

  it("offers no link into /chat/channels", async () => {
    await renderSidebar([channel(1, "design", "PUBLIC")]);
    await screen.findByText("design");
    expect(document.querySelector('a[href^="/chat/channels"]')).toBeNull();
  });
});
