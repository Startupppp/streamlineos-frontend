import { CHAT_NAV_ITEMS } from "./chat-sidebar-nav";
import {
  CHAT_NOTIFICATION_OPTIONS,
  isChatNotificationPreference,
} from "./chat-notification-preferences";

describe("chat settings ownership", () => {
  it("keeps navigation focused on daily conversation tasks", () => {
    expect(CHAT_NAV_ITEMS.map((item) => item.href)).toEqual([
      "/chat",
      "/chat/channels",
    ]);
  });

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
