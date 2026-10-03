import {
  NOTIFICATION_COMMANDS,
  CHAT_COMMANDS,
  ALL_COMMANDS,
} from "@/lib/command-catalog";

describe("command catalog — classification coverage", () => {
  it("all notification commands are classified as SELF (universal)", () => {
    const entries = Object.entries(NOTIFICATION_COMMANDS);
    expect(entries.length).toBeGreaterThan(0);
    for (const [, entry] of entries)
      expect(entry.classification.kind).toBe("SELF");
    expect(entries.length).toBe(15);
  });

  it("chat commands include both PERMISSIONED and SELF entries", () => {
    const entries = Object.entries(CHAT_COMMANDS);
    const permissioned = entries.filter(([, e]) => e.classification.kind === "PERMISSIONED");
    const selfCmds = entries.filter(([, e]) => e.classification.kind === "SELF");
    expect(permissioned.length).toBeGreaterThan(0);
    expect(selfCmds.length).toBeGreaterThan(0);
  });

  it("ALL_COMMANDS includes both notification and chat domains", () => {
    expect(Object.keys(ALL_COMMANDS)).toContain("notifications");
    expect(Object.keys(ALL_COMMANDS)).toContain("chat");
  });

  it("every command entry has an endpoint string", () => {
    for (const domain of Object.values(ALL_COMMANDS))
      for (const entry of Object.values(domain))
        expect(typeof entry.endpoint).toBe("string");
  });

  it("inventories separate global and scoped mark-all endpoints", () => {
    expect(NOTIFICATION_COMMANDS.markAllRead.endpoint).toBe("PATCH /notifications/read-all");
    expect(NOTIFICATION_COMMANDS.markSourceRead.endpoint).toBe("PATCH /notifications/source/:sourceModule/read-all");
  });

  it("inventories explicit self-owned unsnooze without a past-date snooze alias", () => {
    expect(NOTIFICATION_COMMANDS.unsnooze.endpoint).toBe("PATCH /notifications/:notificationId/unsnooze");
    expect(NOTIFICATION_COMMANDS.unsnooze.classification.kind).toBe("SELF");
  });
});
