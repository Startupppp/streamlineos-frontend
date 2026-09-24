import { render, screen, fireEvent, act } from "@testing-library/react";
import type { ReactNode } from "react";

let mockReplace: jest.Mock;
let mockSearchParams: URLSearchParams;

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => "/chat",
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "user-1" } }, status: "authenticated" }),
}));

jest.mock("@/features/chat/channel-sidebar", () => ({
  ChannelSidebar: ({ onSelectChannel }: { onSelectChannel: (id: number) => void }) => (
    <button data-testid="select-ch-5" onClick={() => onSelectChannel(5)}>
      select channel
    </button>
  ),
}));

jest.mock("@/features/chat/empty-chat-state", () => ({
  EmptyChatState: () => <div data-testid="empty-chat" />,
}));

jest.mock("@/features/chat/chat-shell", () => ({
  useChatSidebarCollapse: () => ({ sidebarCollapsed: false, handleToggleSidebar: jest.fn() }),
}));

jest.mock("@/features/chat/chat-shell-layout", () => ({
  getChatConversationListPaneClassName: () => "flex",
  getChatMessagePaneClassName: () => "flex",
}));

jest.mock("@/features/chat/chat-lazy-fallbacks", () => ({
  ChatOverlayFallback: () => null,
  ChatPanelFallback: () => null,
}));

jest.mock("@/features/chat/chat-ably-suite", () => ({
  ChatAblySuite: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

jest.mock("@/features/chat/message-panel", () => ({
  MessagePanel: () => <div data-testid="message-panel" />,
}));

jest.mock("@/features/chat/channel-info-panel", () => ({
  ChannelInfoPanel: () => <div />,
}));

jest.mock("@/features/chat/new-dm-dialog", () => ({
  NewDMDialog: () => null,
}));

jest.mock("@/features/chat/new-group-dialog", () => ({
  NewGroupDialog: () => null,
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

import { ChatHomePage } from "./chat-home-page";

beforeEach(() => {
  mockReplace = jest.fn();
  mockSearchParams = new URLSearchParams();
  jest.clearAllMocks();
  mockReplace = jest.fn();
});

describe("ChatHomePage — channel URL persistence (STRE-75)", () => {
  it("mount with ?channel=<id> does not strip the param — the channel survives a page refresh", async () => {
    mockSearchParams = new URLSearchParams("channel=5");
    render(<ChatHomePage />);
    await act(async () => {});
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("selecting a channel writes ?channel=<id> to the URL so a reload reopens the same conversation", async () => {
    render(<ChatHomePage />);
    await act(async () => {});
    fireEvent.click(screen.getByTestId("select-ch-5"));
    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("channel=5"),
      expect.objectContaining({ scroll: false }),
    );
  });

  it("selecting a channel preserves other query params already present on the URL", async () => {
    mockSearchParams = new URLSearchParams("foo=bar");
    render(<ChatHomePage />);
    await act(async () => {});
    fireEvent.click(screen.getByTestId("select-ch-5"));
    const calls = mockReplace.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const calledUrl = calls[calls.length - 1][0] as string;
    const params = new URLSearchParams(calledUrl.includes("?") ? calledUrl.split("?")[1] : "");
    expect(params.get("channel")).toBe("5");
    expect(params.get("foo")).toBe("bar");
  });
});
