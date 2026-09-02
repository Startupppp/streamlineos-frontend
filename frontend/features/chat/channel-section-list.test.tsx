/**
 * `useChatChannels` drains every cursor page into a single array, so the sidebar
 * holds every channel the member belongs to and mounts each one twice — compact
 * rail plus section. These assert the bound, that nothing is lost behind it, and
 * that the bound does not cost the list its semantics.
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ChannelSectionList,
  CHANNEL_SECTION_PAGE_SIZE,
} from "./channel-section-list";
import type { Channel } from "./chat-types";

jest.mock("./channel-item", () => ({
  ChannelItem: ({ channel }: { channel: { id: number; name: string } }) => (
    <button type="button">{channel.name}</button>
  ),
}));

function makeChannels(count: number): Channel[] {
  return Array.from(
    { length: count },
    (_, i) => ({ id: i + 1, name: `channel-${i + 1}`, unreadCount: 0 }) as unknown as Channel,
  );
}

const onlineUserIds = new Set<string>();
const onSelectChannel = () => undefined;

function renderList(count: number) {
  return render(
    <ChannelSectionList
      channels={makeChannels(count)}
      label="Direct messages"
      activeChannelId={null}
      currentUserId="user-1"
      onlineUserIds={onlineUserIds}
      onSelectChannel={onSelectChannel}
    />,
  );
}

describe("ChannelSectionList — the mounted row count is bounded, not tenant-sized", () => {
  it("mounts one page of rows for a 500-channel member, not 500", () => {
    renderList(500);
    expect(screen.getAllByRole("listitem")).toHaveLength(CHANNEL_SECTION_PAGE_SIZE);
  });

  it("mounts every row when the collection already fits inside one page", () => {
    renderList(12);
    expect(screen.getAllByRole("listitem")).toHaveLength(12);
    expect(screen.queryByRole("button", { name: /show .* more/i })).toBeNull();
  });
});

describe("ChannelSectionList — nothing is lost behind the bound", () => {
  it("names how many remain and how many are shown", () => {
    renderList(500);
    expect(
      screen.getByRole("button", { name: "Show 30 more direct messages (30 of 500)" }),
    ).toBeInTheDocument();
  });

  it("reveals the next page on request, in order and with no repeat", async () => {
    const user = userEvent.setup();
    renderList(500);
    await user.click(screen.getByRole("button", { name: /show 30 more/i }));

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(CHANNEL_SECTION_PAGE_SIZE * 2);
    const names = items.map((item) => item.textContent);
    expect(new Set(names).size).toBe(names.length);
    expect(names[0]).toBe("channel-1");
    expect(names[names.length - 1]).toBe("channel-60");
  });

  it("walks all the way to the final channel", async () => {
    const user = userEvent.setup();
    renderList(65);
    await user.click(screen.getByRole("button", { name: /show 30 more/i }));
    await user.click(screen.getByRole("button", { name: /show 5 more/i }));
    expect(screen.getAllByRole("listitem")).toHaveLength(65);
    expect(screen.getByText("channel-65")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /show .* more/i })).toBeNull();
  });
});

describe("ChannelSectionList — the bound does not cost the list its semantics", () => {
  it("keeps the list labelled so assistive tech can name it", () => {
    renderList(500);
    expect(
      screen.getByRole("list", { name: "Direct messages" }),
    ).toBeInTheDocument();
  });

  it("reports the true set size on every row, not the rendered slice", () => {
    renderList(500);
    const list = screen.getByRole("list", { name: "Direct messages" });
    const items = within(list).getAllByRole("listitem");
    for (const item of items) expect(item).toHaveAttribute("aria-setsize", "500");
  });

  it("gives each row its position within the whole collection", () => {
    renderList(500);
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveAttribute("aria-posinset", "1");
    expect(items[items.length - 1]).toHaveAttribute(
      "aria-posinset",
      String(CHANNEL_SECTION_PAGE_SIZE),
    );
  });

  it("keeps every rendered row reachable by keyboard", async () => {
    const user = userEvent.setup();
    renderList(500);
    await user.tab();
    expect(screen.getByRole("button", { name: "channel-1" })).toHaveFocus();
  });
});
