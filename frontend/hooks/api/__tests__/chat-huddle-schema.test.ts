import { chatHuddleContract } from "@/hooks/api/chat-schema";

const HUDDLE = {
  id: 11,
  channelId: 7,
  status: "active",
  calendarEventId: null,
  meetingProvider: "google_meet",
  meetingUrl: "https://meet.google.com/abc-defg-hij",
  startedAt: "2026-09-02T12:00:00.000Z",
  endedAt: null,
  startedBy: "usr_alice",
  startedByUser: { id: "usr_alice", name: "Alice" },
  participants: [],
};

describe("the huddle contract carries the meeting provider", () => {
  it.each(["google_meet", "microsoft_teams", null])("accepts meetingProvider %s", (meetingProvider) => {
    expect(chatHuddleContract.safeParse({ ...HUDDLE, meetingProvider }).success).toBe(true);
  });

  it("rejects a provider the backend never emits, so a new provider fails loudly instead of rendering a wrong label", () => {
    expect(chatHuddleContract.safeParse({ ...HUDDLE, meetingProvider: "zoom" }).success).toBe(false);
  });

  it("rejects a payload that omits the key, since legacy rows send null rather than nothing", () => {
    const { meetingProvider: _meetingProvider, ...withoutProvider } = HUDDLE;
    expect(chatHuddleContract.safeParse(withoutProvider).success).toBe(false);
  });

  it("stays strict about unknown keys", () => {
    expect(chatHuddleContract.safeParse({ ...HUDDLE, kicked: true }).success).toBe(false);
  });
});
