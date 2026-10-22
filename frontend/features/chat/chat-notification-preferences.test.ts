import {
  CHAT_NOTIFICATION_OPTIONS,
  isChatNotificationPreference,
} from "./chat-notification-preferences";

describe("chat settings ownership", () => {
  it("provides one typed notification model for DMs and groups", () => {
    expect(CHAT_NOTIFICATION_OPTIONS.map((option) => option.value)).toEqual([
      "DEFAULT",
      "ALL",
      "MENTIONS",
      "NOTHING",
    ]);
    expect(isChatNotificationPreference("MENTIONS")).toBe(true);
    expect(isChatNotificationPreference("INVALID")).toBe(false);
  });
});
