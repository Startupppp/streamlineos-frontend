import { parseWorkTab, WORK_TABS, TAB_CONFIG } from "./use-my-work-data";

describe("parseWorkTab", () => {
  it("returns assigned for null", () => expect(parseWorkTab(null)).toBe("assigned"));
  it("returns assigned for empty string", () => expect(parseWorkTab("")).toBe("assigned"));
  it("returns assigned for unknown value", () => expect(parseWorkTab("unknown")).toBe("assigned"));
  it("returns created for created", () => expect(parseWorkTab("created")).toBe("created"));
  it("returns overdue for overdue", () => expect(parseWorkTab("overdue")).toBe("overdue"));
  it("returns due-soon for due-soon", () => expect(parseWorkTab("due-soon")).toBe("due-soon"));
  it("returns activity for activity", () => expect(parseWorkTab("activity")).toBe("activity"));
  it("returns subscribed for subscribed", () => expect(parseWorkTab("subscribed")).toBe("subscribed"));
  it("returns subscribed for watching alias", () => expect(parseWorkTab("watching")).toBe("subscribed"));
  it("returns today for today", () => expect(parseWorkTab("today")).toBe("today"));
  it("returns upcoming for upcoming", () => expect(parseWorkTab("upcoming")).toBe("upcoming"));
  it("returns blocked for blocked", () => expect(parseWorkTab("blocked")).toBe("blocked"));
  it("returns waiting for waiting", () => expect(parseWorkTab("waiting")).toBe("waiting"));
  it("returns done for done", () => expect(parseWorkTab("done")).toBe("done"));
  it("falls back to assigned for unsupported snoozed links", () => expect(parseWorkTab("snoozed")).toBe("assigned"));
});

describe("WORK_TABS includes all tabs", () => {
  it("has today tab", () => expect(WORK_TABS).toContain("today"));
  it("has upcoming tab", () => expect(WORK_TABS).toContain("upcoming"));
  it("has blocked tab", () => expect(WORK_TABS).toContain("blocked"));
  it("has waiting tab", () => expect(WORK_TABS).toContain("waiting"));
  it("has done tab", () => expect(WORK_TABS).toContain("done"));
  it("does not advertise a snoozed view without a Build-ticket snooze contract", () => expect(WORK_TABS).not.toContain("snoozed"));
  it("still has all original tabs", () => {
    expect(WORK_TABS).toContain("assigned");
    expect(WORK_TABS).toContain("created");
    expect(WORK_TABS).toContain("subscribed");
    expect(WORK_TABS).toContain("overdue");
    expect(WORK_TABS).toContain("due-soon");
    expect(WORK_TABS).toContain("activity");
  });
});

describe("TAB_CONFIG labels for new tabs", () => {
  it("today has Today label", () => expect(TAB_CONFIG.today.label).toBe("Today"));
  it("upcoming has Upcoming label", () => expect(TAB_CONFIG.upcoming.label).toBe("Upcoming"));
  it("blocked has Blocked label", () => expect(TAB_CONFIG.blocked.label).toBe("Blocked"));
  it("waiting has Waiting label", () => expect(TAB_CONFIG.waiting.label).toBe("Waiting"));
  it("done has Done label", () => expect(TAB_CONFIG.done.label).toBe("Done"));
});
