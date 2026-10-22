import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChannelListEntry } from "./channel-list-entry";
import type { Channel } from "@/types/chat";

let itemRenders = 0;

jest.mock("./channel-item", () => ({
  ChannelItem: ({ channel }: { channel: { id: number } }) => {
    itemRenders += 1;
    return <div data-testid="channel-item">{channel.id}</div>;
  },
}));

const channel = { id: 1, name: "general", unreadCount: 0 } as unknown as Channel;
const onlineUserIds = new Set<string>(["user-1"]);
const onSelectChannel = () => undefined;

function Harness() {
  const [tick, setTick] = useState(0);
  return (
    <div>
      <button type="button" onClick={() => setTick((t) => t + 1)}>
        rerender parent
      </button>
      <span>{tick}</span>
      <ChannelListEntry
        channel={channel}
        activeChannelId={null}
        currentUserId="user-1"
        onlineUserIds={onlineUserIds}
        onSelectChannel={onSelectChannel}
      />
    </div>
  );
}

describe("ChannelListEntry render count", () => {
  beforeEach(() => {
    itemRenders = 0;
  });

  it("renders once and does not re-render when the sidebar re-renders with identical props", () => {
    render(<Harness />);
    expect(itemRenders).toBe(1);

    const button = screen.getByRole("button", { name: "rerender parent" });
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(itemRenders).toBe(1);
  });
});
