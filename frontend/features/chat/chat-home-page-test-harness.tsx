import type { ReactNode } from "react";

export const mockNav: { replace: jest.Mock; push: jest.Mock; searchParams: URLSearchParams } = {
  replace: jest.fn(),
  push: jest.fn(),
  searchParams: new URLSearchParams(),
};
export const mockPageState: { current: { kind: string } } = { current: { kind: "ready" } };

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockNav.replace, push: mockNav.push }),
  useSearchParams: () => mockNav.searchParams,
  usePathname: () => "/chat",
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "user-1" } }, status: "authenticated" }),
}));

jest.mock("@/hooks/api/chat-core-read", () => ({
  useChatChannels: () => ({
    channels: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => mockPageState.current,
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    resolution,
    loading,
    children,
  }: {
    resolution: { kind: string };
    loading: ReactNode;
    children: ReactNode;
  }) => {
    if (resolution.kind === "loading") return <>{loading}</>;
    if (resolution.kind === "denied") return <div>Access Restricted</div>;
    return <>{children}</>;
  },
}));

interface MockSidebarProps {
  onSelectChannel: (id: number) => void;
  onOpenMessage: (channelId: number, messageId: number) => void;
  createDialog: string | null;
  onCreateDialogChange: (dialog: "dm" | "channel" | null) => void;
  searchScope: string | null;
  onSearchScopeChange: (scope: "messages" | "channels" | "people" | null) => void;
}

jest.mock("@/features/chat/channel-sidebar", () => ({
  ChannelSidebar: (props: MockSidebarProps) => (
    <div>
      <span data-testid="sidebar-create-dialog">{props.createDialog ?? "none"}</span>
      <span data-testid="sidebar-search-scope">{props.searchScope ?? "none"}</span>
      <button data-testid="select-ch-5" onClick={() => props.onSelectChannel(5)}>
        select channel 5
      </button>
      <button data-testid="select-ch-6" onClick={() => props.onSelectChannel(6)}>
        select channel 6
      </button>
      <button data-testid="open-message" onClick={() => props.onOpenMessage(7, 99)}>
        open message
      </button>
      <button data-testid="close-create" onClick={() => props.onCreateDialogChange(null)}>
        close create
      </button>
      <button data-testid="close-search" onClick={() => props.onSearchScopeChange(null)}>
        close search
      </button>
      <button data-testid="scope-people" onClick={() => props.onSearchScopeChange("people")}>
        people scope
      </button>
    </div>
  ),
}));

jest.mock("@/features/chat/empty-chat-state", () => ({
  EmptyChatState: ({
    onNewDM,
    onNewChannel,
    onSearch,
  }: {
    onNewDM: () => void;
    onNewChannel: () => void;
    onSearch: () => void;
  }) => (
    <div data-testid="empty-chat">
      <button onClick={onNewDM}>empty new dm</button>
      <button onClick={onNewChannel}>empty new channel</button>
      <button onClick={onSearch}>empty search</button>
    </div>
  ),
}));

jest.mock("@/features/chat/chat-lazy-fallbacks", () => ({
  ChatOverlayFallback: () => null,
  ChatPanelFallback: () => null,
}));

jest.mock("@/features/chat/chat-ably-suite", () => ({
  ChatAblySuite: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

jest.mock("@/features/chat/message-panel", () => ({
  MessagePanel: ({
    channelId,
    scrollToMessageId,
    onBack,
    onLeaveMessage,
  }: {
    channelId: number;
    scrollToMessageId?: number | null;
    onBack: () => void;
    onLeaveMessage?: () => void;
  }) => (
    <div data-testid="message-panel">
      <span data-testid="panel-channel">{channelId}</span>
      <span data-testid="panel-message">{scrollToMessageId ?? "none"}</span>
      <button onClick={onBack}>mobile back</button>
      <button onClick={onLeaveMessage}>leave message</button>
    </div>
  ),
}));

jest.mock("@/features/chat/channel-info-panel", () => ({
  ChannelInfoPanel: () => <div />,
}));

jest.mock("@/features/chat/new-dm-dialog", () => ({
  NewDMDialog: () => <div data-testid="page-new-dm-dialog" />,
}));

jest.mock("@/features/chat/new-group-dialog", () => ({
  NewGroupDialog: () => <div data-testid="page-new-group-dialog" />,
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: ReactNode }) => <>{children}</>,
  SheetContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SheetTitle: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

jest.mock("framer-motion", () => ({
  motion: { div: ({ children }: { children?: ReactNode }) => <>{children}</> },
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

jest.mock("@radix-ui/react-visually-hidden", () => ({
  Root: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

export function lastUrl(mock: jest.Mock): URLSearchParams {
  const calls = mock.mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  const url = String(calls[calls.length - 1][0]);
  return new URLSearchParams(url.includes("?") ? url.split("?")[1] : "");
}

export function resetChatHomeHarness() {
  jest.clearAllMocks();
  mockNav.replace = jest.fn();
  mockNav.push = jest.fn();
  mockNav.searchParams = new URLSearchParams();
  mockPageState.current = { kind: "ready" };
}
