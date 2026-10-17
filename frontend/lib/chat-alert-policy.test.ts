import type { Channel, ChannelMember, ChatNotificationPreference } from "@/types/chat";
import {
  chatAlertDecision,
  chatAlertIsRaised,
  viewerChannelState,
} from "@/lib/chat-alert-policy";

const NOW = new Date("2026-10-02T12:00:00.000Z");
const MUTED_UNTIL = new Date("2026-10-03T12:00:00.000Z").toISOString();
const MUTE_EXPIRED = new Date("2026-10-01T12:00:00.000Z").toISOString();

const VIEWER_ID = "user-1";
const SENDER_ID = "user-2";
const CHANNEL_ID = 7;

function decide(overrides: {
  kind?: "message" | "mention";
  senderId?: unknown;
  activeChannelId?: number | null;
  mutedUntil?: Date | string | null;
  notificationPreference?: ChatNotificationPreference;
  viewerKnown?: boolean;
}) {
  return chatAlertDecision({
    kind: overrides.kind ?? "message",
    channelId: CHANNEL_ID,
    senderId: overrides.senderId ?? SENDER_ID,
    currentUserId: VIEWER_ID,
    activeChannelId: overrides.activeChannelId ?? null,
    viewer:
      overrides.viewerKnown === false
        ? undefined
        : {
            mutedUntil: overrides.mutedUntil ?? null,
            notificationPreference:
              overrides.notificationPreference ?? "DEFAULT",
          },
    now: NOW,
  });
}

describe("chatAlertDecision — mute", () => {
  it("suppresses an ordinary message while the mute deadline is in the future", () => {
    expect(decide({ mutedUntil: MUTED_UNTIL })).toBe("muted");
  });

  it("alerts once the mute deadline has passed, so the field is a deadline not a flag", () => {
    expect(decide({ mutedUntil: MUTE_EXPIRED })).toBe("alert");
  });

  it("alerts when the channel was never muted", () => {
    expect(decide({ mutedUntil: null })).toBe("alert");
  });

  it("alerts rather than suppressing when mutedUntil is unparseable, so bad data cannot silence chat", () => {
    expect(decide({ mutedUntil: "not-a-date" })).toBe("alert");
  });

  it("still alerts a mention in a muted channel, matching the backend which filters mentions on preference only", () => {
    expect(decide({ kind: "mention", mutedUntil: MUTED_UNTIL })).toBe("alert");
  });
});

describe("chatAlertDecision — notification preference", () => {
  it("suppresses an ordinary message when the viewer chose NOTHING", () => {
    expect(decide({ notificationPreference: "NOTHING" })).toBe("preference");
  });

  it("suppresses an ordinary message when the viewer chose MENTIONS", () => {
    expect(decide({ notificationPreference: "MENTIONS" })).toBe("preference");
  });

  it("alerts a mention when the viewer chose MENTIONS, which is the whole point of that setting", () => {
    expect(
      decide({ kind: "mention", notificationPreference: "MENTIONS" }),
    ).toBe("alert");
  });

  it("suppresses even a mention when the viewer chose NOTHING", () => {
    expect(
      decide({ kind: "mention", notificationPreference: "NOTHING" }),
    ).toBe("preference");
  });

  it("alerts on ALL", () => {
    expect(decide({ notificationPreference: "ALL" })).toBe("alert");
  });

  it("alerts on DEFAULT, because only the backend can resolve the organisation default", () => {
    expect(decide({ notificationPreference: "DEFAULT" })).toBe("alert");
  });
});

describe("chatAlertDecision — precedence", () => {
  it("calls the viewer's own message own-message before reading any preference", () => {
    expect(
      decide({
        senderId: VIEWER_ID,
        mutedUntil: MUTED_UNTIL,
        notificationPreference: "ALL",
      }),
    ).toBe("own-message");
  });

  it("suppresses the channel the viewer is looking at before reading mute state", () => {
    expect(
      decide({ activeChannelId: CHANNEL_ID, notificationPreference: "ALL" }),
    ).toBe("active-channel");
  });

  it("trusts the backend filter when the channel is not loaded and local state is unknown", () => {
    expect(decide({ viewerKnown: false })).toBe("alert");
  });
});

describe("chatAlertIsRaised", () => {
  it("is true only for alert", () => {
    expect(chatAlertIsRaised("alert")).toBe(true);
  });

  it("is false for every suppression reason", () => {
    for (const decision of [
      "own-message",
      "active-channel",
      "muted",
      "preference",
    ] as const)
      expect(chatAlertIsRaised(decision)).toBe(false);
  });
});

describe("viewerChannelState", () => {
  function channelWithMembers(members: ChannelMember[]): Channel {
    return {
      id: CHANNEL_ID,
      name: "general",
      type: "GROUP",
      avatarUrl: null,
      isArchived: false,
      entityType: null,
      entityId: null,
      members,
      unreadCount: 0,
      lastMessage: null,
    };
  }

  function memberFor(
    userId: string,
    overrides: Partial<ChannelMember> = {},
  ): ChannelMember {
    return {
      id: 1,
      channelId: CHANNEL_ID,
      userId,
      role: "MEMBER",
      mutedUntil: null,
      isFavorite: false,
      notificationPreference: "DEFAULT",
      user: { id: userId, name: "Someone", image: null },
      ...overrides,
    };
  }

  it("reads the viewer's own row out of the bounded member preview", () => {
    const channel = channelWithMembers([
      memberFor(SENDER_ID, { notificationPreference: "NOTHING" }),
      memberFor(VIEWER_ID, { mutedUntil: MUTED_UNTIL }),
    ]);

    expect(viewerChannelState(channel, VIEWER_ID)).toEqual({
      mutedUntil: MUTED_UNTIL,
      notificationPreference: "DEFAULT",
    });
  });

  it("returns undefined when the preview truncated the viewer's own row away", () => {
    const channel = channelWithMembers([memberFor(SENDER_ID)]);

    expect(viewerChannelState(channel, VIEWER_ID)).toBeUndefined();
  });

  it("returns undefined for an unloaded channel", () => {
    expect(viewerChannelState(undefined, VIEWER_ID)).toBeUndefined();
  });

  it("returns undefined before the session resolves a viewer id", () => {
    const channel = channelWithMembers([memberFor(VIEWER_ID)]);

    expect(viewerChannelState(channel, undefined)).toBeUndefined();
  });
});
