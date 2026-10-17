import {
  channelMatchesInboxFilter,
  countChatInboxFilters,
  readChatInboxFilter,
  withChatInboxFilter,
} from "./chat-inbox-filter";

describe("readChatInboxFilter", () => {
  it("accepts the four inbox views and treats anything else as all", () => {
    expect(readChatInboxFilter("unread")).toBe("unread");
    expect(readChatInboxFilter("direct")).toBe("direct");
    expect(readChatInboxFilter("channels")).toBe("channels");
    expect(readChatInboxFilter("all")).toBe("all");
    expect(readChatInboxFilter(null)).toBe("all");
    expect(readChatInboxFilter("archived")).toBe("all");
  });
});

describe("withChatInboxFilter", () => {
  it("writes the view into the query and removes it for all", () => {
    const params = new URLSearchParams("channel=4");
    expect(withChatInboxFilter(params, "unread")).toBe("channel=4&inbox=unread");
    expect(withChatInboxFilter(new URLSearchParams("inbox=unread&channel=4"), "all")).toBe(
      "channel=4",
    );
  });
});

describe("channelMatchesInboxFilter", () => {
  const direct = { type: "DIRECT", unreadCount: 2 };
  const channel = { type: "PUBLIC", unreadCount: 0 };

  it("keeps unread conversations, direct messages, and every non-direct channel", () => {
    expect(channelMatchesInboxFilter(direct, "unread")).toBe(true);
    expect(channelMatchesInboxFilter(channel, "unread")).toBe(false);
    expect(channelMatchesInboxFilter(direct, "direct")).toBe(true);
    expect(channelMatchesInboxFilter(channel, "direct")).toBe(false);
    expect(channelMatchesInboxFilter(channel, "channels")).toBe(true);
    expect(channelMatchesInboxFilter(direct, "channels")).toBe(false);
    expect(channelMatchesInboxFilter(channel, "all")).toBe(true);
  });
});

describe("countChatInboxFilters", () => {
  it("counts unread conversations separately for direct messages and channels", () => {
    expect(
      countChatInboxFilters([
        { type: "DIRECT", unreadCount: 1 },
        { type: "DIRECT", unreadCount: 0 },
        { type: "GROUP", unreadCount: 3 },
        { type: "PUBLIC", unreadCount: 0 },
      ]),
    ).toEqual({ all: 4, unread: 2, direct: 1, channels: 1 });
  });
});
