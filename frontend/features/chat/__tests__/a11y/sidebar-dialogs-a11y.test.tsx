import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axeViolationIds, expectNoAxeViolations } from "@/test-utils/axe";
import type { ChatCreateDialog } from "../../channel-sidebar";
import type { ChatSearchScope } from "../../chat-search-scope";

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
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn(), upload: jest.fn() },
  isApiError: () => false,
  getApiErrorCode: () => undefined,
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(() => ({ data: { scopes: {}, modules: {} }, refetch: jest.fn() })),
  useCan: jest.fn(() => true),
  useModuleEnabled: jest.fn().mockReturnValue(true),
}));

jest.mock("@/hooks/api/chat-channel-mutations", () => ({
  useJoinChannel: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useCreateDMChannel: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useCreateGroupChannel: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useCreatePublicChannel: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useCreatePrivateChannel: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

const { apiClient } = jest.requireMock("@/lib/api-client") as {
  apiClient: { get: jest.Mock };
};

function Wrapper({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function channel(id: number, name: string, type: string) {
  return {
    id,
    name,
    type,
    avatarUrl: null,
    isArchived: false,
    entityType: null,
    entityId: null,
    unreadCount: 2,
    memberCount: 1,
    membersTruncated: false,
    members: [
      {
        id: 1,
        userId: "user-1",
        role: "MEMBER",
        mutedUntil: null,
        isFavorite: false,
        notificationPreference: "DEFAULT",
        user: { id: "user-1", name: "Me", image: null },
      },
    ],
    lastMessage: null,
  };
}

function mockApi() {
  apiClient.get.mockImplementation(async (path: string) => {
    if (path === "/chat/channels")
      return {
        channels: [channel(1, "design", "PUBLIC"), channel(2, "leads", "PRIVATE")],
        nextCursor: null,
      };
    if (path.startsWith("/chat/channels")) return { channels: [], nextCursor: null };
    return [];
  });
}

type SidebarComponent = typeof import("../../channel-sidebar").ChannelSidebar;

function Host({
  Sidebar,
  initialScope,
  initialDialog,
}: {
  Sidebar: SidebarComponent;
  initialScope: ChatSearchScope | null;
  initialDialog: ChatCreateDialog | null;
}) {
  const [scope, setScope] = useState<ChatSearchScope | null>(initialScope);
  const [dialog, setDialog] = useState<ChatCreateDialog | null>(initialDialog);
  return (
    <Sidebar
      activeChannelId={null}
      currentUserId="user-1"
      createDialog={dialog}
      onCreateDialogChange={setDialog}
      searchScope={scope}
      onSearchScopeChange={setScope}
      onSelectChannel={jest.fn()}
      onOpenMessage={jest.fn()}
    />
  );
}

async function renderHost(
  options: { initialScope?: ChatSearchScope; initialDialog?: ChatCreateDialog } = {},
) {
  const { ChannelSidebar } = await import("../../channel-sidebar");
  return render(
    <Wrapper>
      <Host
        Sidebar={ChannelSidebar}
        initialScope={options.initialScope ?? null}
        initialDialog={options.initialDialog ?? null}
      />
    </Wrapper>,
  );
}

jest.setTimeout(30000);

beforeEach(() => {
  jest.clearAllMocks();
  mockApi();
});

describe("sidebar: axe and screen reader", () => {
  it("has no axe violations with a populated list", async () => {
    const { container } = await renderHost();
    await screen.findByText("design");
    expect(await axeViolationIds(container)).toEqual([]);
  });

  it("names the search opener and the New menu trigger", async () => {
    await renderHost();
    await screen.findByText("design");
    expect(
      screen.getByRole("button", { name: "Search messages, channels and people" }),
    ).toHaveAccessibleName();
    expect(screen.getByRole("button", { name: /new/i })).toHaveAccessibleName();
    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveAccessibleName();
    }
  });

  it("labels the conversation lists", async () => {
    await renderHost();
    await screen.findByText("design");
    expect(screen.getAllByRole("list", { name: "Conversations" }).length).toBeGreaterThan(0);
  });
});

describe("search dialog", () => {
  it("has no axe violations when open", async () => {
    jest.useRealTimers();
    await renderHost({ initialScope: "messages" });
    await screen.findByRole("dialog");
    await screen.findByRole("textbox", { name: "Search terms" });
    expect(await axeViolationIds(document.body)).toEqual([]);
  });

  it("opens from the keyboard, focuses the search field and Esc returns focus to the opener", async () => {
    const user = userEvent.setup();
    await renderHost();
    await screen.findByText("design");
    const opener = screen.getByRole("button", { name: "Search messages, channels and people" });
    opener.focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Search terms" })).toHaveFocus());
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("the scope tabs are arrow-key navigable and named", async () => {
    const user = userEvent.setup();
    await renderHost({ initialScope: "messages" });
    const tab = await screen.findByRole("tab", { name: "Messages" });
    await user.click(tab);
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toHaveAttribute("role", "tab");
    expect(document.activeElement).not.toBe(tab);
  });
});

describe("new channel dialog", () => {
  it("has no violations when open", async () => {
    await renderHost({ initialDialog: "channel" });
    await screen.findByRole("dialog");
    document.querySelectorAll<HTMLElement>("input.hidden").forEach((el) => {
      el.style.display = "none";
    });
    await expectNoAxeViolations(document.body);
  });

  it("Esc closes it and returns focus to the New trigger", async () => {
    const user = userEvent.setup();
    await renderHost();
    await screen.findByText("design");
    const trigger = screen.getByRole("button", { name: /new/i });
    await user.click(trigger);
    await user.click(await screen.findByRole("menuitem", { name: "New channel" }));
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
