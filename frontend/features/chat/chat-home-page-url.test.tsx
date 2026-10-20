import { render, screen, fireEvent, act } from "@testing-library/react";
import type { ReactNode } from "react";

let mockReplace: jest.Mock;
let mockPush: jest.Mock;
let mockSearchParams: URLSearchParams;
const mockPageState: { current: { kind: string } } = { current: { kind: "ready" } };

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  useSearchParams: () => mockSearchParams,
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
  }: {
    channelId: number;
    scrollToMessageId?: number | null;
    onBack: () => void;
  }) => (
    <div data-testid="message-panel">
      <span data-testid="panel-channel">{channelId}</span>
      <span data-testid="panel-message">{scrollToMessageId ?? "none"}</span>
      <button onClick={onBack}>mobile back</button>
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

import nextConfig from "@/next.config";
import { ChatHomePage } from "./chat-home-page";

function lastUrl(mock: jest.Mock): URLSearchParams {
  const calls = mock.mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  const url = String(calls[calls.length - 1][0]);
  return new URLSearchParams(url.includes("?") ? url.split("?")[1] : "");
}

beforeEach(() => {
  jest.clearAllMocks();
  mockReplace = jest.fn();
  mockPush = jest.fn();
  mockSearchParams = new URLSearchParams();
  mockPageState.current = { kind: "ready" };
});

describe("ChatHomePage — the URL is the only source of the selected conversation", () => {
  it("mount with ?channel=<id> opens that conversation and does not rewrite the URL", async () => {
    mockSearchParams = new URLSearchParams("channel=5");
    render(<ChatHomePage />);
    await act(async () => {});
    expect(screen.getByTestId("panel-channel")).toHaveTextContent("5");
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("selecting a conversation pushes history so Back returns to the previous one", async () => {
    mockSearchParams = new URLSearchParams("foo=bar");
    render(<ChatHomePage />);
    await act(async () => {});
    fireEvent.click(screen.getByTestId("select-ch-5"));
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("channel=5"),
      expect.objectContaining({ scroll: false }),
    );
    const params = lastUrl(mockPush);
    expect(params.get("channel")).toBe("5");
    expect(params.get("foo")).toBe("bar");
  });

  it("follows browser back/forward: a new ?channel re-renders the panel with no local copy to go stale", async () => {
    mockSearchParams = new URLSearchParams("channel=5");
    const { rerender } = render(<ChatHomePage />);
    await act(async () => {});
    expect(screen.getByTestId("panel-channel")).toHaveTextContent("5");

    mockSearchParams = new URLSearchParams("channel=8");
    rerender(<ChatHomePage />);
    expect(screen.getByTestId("panel-channel")).toHaveTextContent("8");

    mockSearchParams = new URLSearchParams();
    rerender(<ChatHomePage />);
    expect(screen.queryByTestId("message-panel")).toBeNull();
    expect(screen.getByTestId("empty-chat")).toBeInTheDocument();
  });

  it("switching conversation drops ?message in the same URL write, so the old anchor never applies to the new channel", async () => {
    mockSearchParams = new URLSearchParams("channel=5&message=99&inbox=unread");
    render(<ChatHomePage />);
    await act(async () => {});
    fireEvent.click(screen.getByTestId("select-ch-6"));
    expect(mockPush).toHaveBeenCalledTimes(1);
    const params = lastUrl(mockPush);
    expect(params.get("channel")).toBe("6");
    expect(params.has("message")).toBe(false);
    expect(params.get("inbox")).toBe("unread");
  });

  it("passes ?message to the panel only alongside its channel", async () => {
    mockSearchParams = new URLSearchParams("channel=5&message=99");
    const { rerender } = render(<ChatHomePage />);
    await act(async () => {});
    expect(screen.getByTestId("panel-message")).toHaveTextContent("99");

    mockSearchParams = new URLSearchParams("message=99");
    rerender(<ChatHomePage />);
    expect(screen.queryByTestId("message-panel")).toBeNull();
  });

  it("a message search result lands on the exact message: one push carries channel and message and closes search", async () => {
    mockSearchParams = new URLSearchParams("channel=5&search=messages");
    render(<ChatHomePage />);
    await act(async () => {});
    fireEvent.click(screen.getByTestId("open-message"));
    expect(mockPush).toHaveBeenCalledTimes(1);
    const params = lastUrl(mockPush);
    expect(params.get("channel")).toBe("7");
    expect(params.get("message")).toBe("99");
    expect(params.has("search")).toBe(false);
  });

  it("mobile Back clears the conversation from the URL so the list shows and browser Forward restores it", async () => {
    mockSearchParams = new URLSearchParams("channel=5&message=99&inbox=direct");
    render(<ChatHomePage />);
    await act(async () => {});
    fireEvent.click(screen.getByText("mobile back"));
    const params = lastUrl(mockPush);
    expect(params.has("channel")).toBe(false);
    expect(params.has("message")).toBe(false);
    expect(params.get("inbox")).toBe("direct");
  });

  it("drops ?message when the list reports the anchored message is no longer available", async () => {
    mockSearchParams = new URLSearchParams("channel=5&message=99");
    render(<ChatHomePage />);
    await act(async () => {});
    act(() => {
      window.dispatchEvent(new CustomEvent("chat:message-unavailable", { detail: 99 }));
    });
    const params = lastUrl(mockReplace);
    expect(params.get("channel")).toBe("5");
    expect(params.has("message")).toBe(false);
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe("ChatHomePage — one owner for New DM / New channel / search", () => {
  it("never mounts a New DM or New channel dialog of its own", async () => {
    mockSearchParams = new URLSearchParams("dm=1");
    render(<ChatHomePage />);
    await act(async () => {});
    fireEvent.click(screen.getByText("empty new channel"));
    expect(screen.queryByTestId("page-new-dm-dialog")).toBeNull();
    expect(screen.queryByTestId("page-new-group-dialog")).toBeNull();
  });

  it("?dm=1 opens the sidebar's New DM dialog, and closing it removes dm=1 without losing other params", async () => {
    mockSearchParams = new URLSearchParams("dm=1&inbox=unread");
    render(<ChatHomePage />);
    await act(async () => {});
    expect(screen.getByTestId("sidebar-create-dialog")).toHaveTextContent("dm");

    fireEvent.click(screen.getByTestId("close-create"));
    const params = lastUrl(mockReplace);
    expect(params.has("dm")).toBe(false);
    expect(params.get("inbox")).toBe("unread");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("empty-state actions open the sidebar's dialogs", async () => {
    render(<ChatHomePage />);
    await act(async () => {});
    fireEvent.click(screen.getByText("empty new dm"));
    expect(screen.getByTestId("sidebar-create-dialog")).toHaveTextContent("dm");
    fireEvent.click(screen.getByText("empty new channel"));
    expect(screen.getByTestId("sidebar-create-dialog")).toHaveTextContent("channel");
    fireEvent.click(screen.getByText("empty search"));
    expect(lastUrl(mockReplace).get("search")).toBe("messages");
  });

  it("chat:open-new-dm and chat:open-new-channel route into the sidebar's dialog state", async () => {
    render(<ChatHomePage />);
    await act(async () => {});
    act(() => {
      window.dispatchEvent(new Event("chat:open-new-channel"));
    });
    expect(screen.getByTestId("sidebar-create-dialog")).toHaveTextContent("channel");
    act(() => {
      window.dispatchEvent(new Event("chat:open-new-dm"));
    });
    expect(screen.getByTestId("sidebar-create-dialog")).toHaveTextContent("dm");
  });

  it("chat:open-search opens the unified search through the URL, honouring a requested scope", async () => {
    render(<ChatHomePage />);
    await act(async () => {});
    act(() => {
      window.dispatchEvent(new CustomEvent("chat:open-search", { detail: "channels" }));
    });
    expect(lastUrl(mockReplace).get("search")).toBe("channels");
  });

  it("?search=<scope> is the search dialog's state; scope changes and close replace history", async () => {
    mockSearchParams = new URLSearchParams("search=channels&channel=5");
    render(<ChatHomePage />);
    await act(async () => {});
    expect(screen.getByTestId("sidebar-search-scope")).toHaveTextContent("channels");

    fireEvent.click(screen.getByTestId("scope-people"));
    expect(lastUrl(mockReplace).get("search")).toBe("people");

    fireEvent.click(screen.getByTestId("close-search"));
    const params = lastUrl(mockReplace);
    expect(params.has("search")).toBe(false);
    expect(params.get("channel")).toBe("5");
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe("ChatHomePage — gated through PageState", () => {
  it("renders the layout skeleton while the conversation list is loading", async () => {
    mockPageState.current = { kind: "loading" };
    render(<ChatHomePage />);
    await act(async () => {});
    expect(screen.getByRole("status", { name: "Loading chat" })).toBeInTheDocument();
    expect(screen.queryByTestId("empty-chat")).toBeNull();
  });

  it("renders the denied surface instead of an empty inbox", async () => {
    mockPageState.current = { kind: "denied" };
    render(<ChatHomePage />);
    await act(async () => {});
    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-chat")).toBeNull();
  });
});

describe("/chat/channels — preserved through a redirect to the unified channel search", () => {
  it("redirects temporarily to /chat?search=channels, which opens search on the Channels tab", async () => {
    const redirects = (await nextConfig.redirects?.()) ?? [];
    const entry = redirects.find((r) => r.source === "/chat/channels");
    expect(entry?.destination).toBe("/chat?search=channels");
    expect(entry && "permanent" in entry ? entry.permanent : undefined).toBe(false);
  });

  it("the redirect target is a state the page understands", async () => {
    mockSearchParams = new URLSearchParams("search=channels");
    render(<ChatHomePage />);
    await act(async () => {});
    expect(screen.getByTestId("sidebar-search-scope")).toHaveTextContent("channels");
  });
});
