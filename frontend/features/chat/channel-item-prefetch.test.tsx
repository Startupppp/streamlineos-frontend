import { fireEvent, render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ChannelItem } from "./channel-item";
import type { Channel } from "@/types/chat";

const mockPrefetch = jest.fn();

jest.mock("@/hooks/api/chat-core-read", () => ({
  usePrefetchChatChannel: () => mockPrefetch,
}));

const channel: Channel = {
  id: 42,
  name: "design",
  type: "PUBLIC",
  avatarUrl: null,
  isArchived: false,
  entityType: null,
  entityId: null,
  members: [],
  memberCount: 0,
  membersTruncated: false,
  unreadCount: 0,
  lastMessage: null,
};

function renderRow(isActive: boolean, compact = false) {
  render(
    <TooltipProvider>
      <ChannelItem
        channel={channel}
        isActive={isActive}
        onClick={() => undefined}
        currentUserId="user-1"
        onlineUserIds={new Set<string>()}
        compact={compact}
      />
    </TooltipProvider>,
  );
  return screen.getByRole("button", { name: /design/ });
}

beforeEach(() => mockPrefetch.mockClear());

describe("ChannelItem — prefetches a conversation before it is opened, so switching is instant", () => {
  it("prefetches the conversation when the pointer enters its row", () => {
    fireEvent.pointerEnter(renderRow(false));
    expect(mockPrefetch).toHaveBeenCalledWith(42);
  });

  it("prefetches the conversation when keyboard focus lands on its row", () => {
    fireEvent.focus(renderRow(false));
    expect(mockPrefetch).toHaveBeenCalledWith(42);
  });

  it("prefetches from the collapsed rail too", () => {
    const row = renderRow(false, true);
    fireEvent.pointerEnter(row);
    fireEvent.focus(row);
    expect(mockPrefetch).toHaveBeenCalledTimes(2);
    expect(mockPrefetch).toHaveBeenCalledWith(42);
  });

  it("does not prefetch the conversation that is already open", () => {
    const row = renderRow(true);
    fireEvent.pointerEnter(row);
    fireEvent.focus(row);
    expect(mockPrefetch).not.toHaveBeenCalled();
  });
});
