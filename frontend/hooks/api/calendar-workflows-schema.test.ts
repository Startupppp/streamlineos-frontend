import {
  calendarWorkflowEffectContract,
  calendarWorkflowPolicyContract,
  calendarWorkflowRuleContract,
} from "./calendar-workflows-schema";

describe("calendar workflow response contracts", () => {
  it("refuses unknown effect states", () => {
    expect(calendarWorkflowEffectContract.safeParse({ status: "LOST" }).success).toBe(false);
  });

  it("refuses policies with unknown channels", () => {
    expect(calendarWorkflowPolicyContract.safeParse({
      version: 1,
      enabled: true,
      dryRun: false,
      allowedChannels: ["FAX"],
      maxRules: 10,
      maxEffectsPerEvent: 10,
      maxEffectsPerDay: 100,
      updatedAt: "2026-10-13T10:00:00.000Z",
    }).success).toBe(false);
  });

  it("refuses rule actions without a valid recipient", () => {
    expect(calendarWorkflowRuleContract.safeParse({
      id: 1,
      name: "Rule",
      description: null,
      status: "active",
      version: 1,
      triggers: ["calendar.booking.created"],
      conditions: [],
      actions: [{
        type: "notification",
        recipients: { type: "external" },
        channels: ["EMAIL"],
        priority: "NORMAL",
        title: "Title",
        message: "Message",
        link: null,
      }],
      createdAt: "2026-10-13T10:00:00.000Z",
      updatedAt: "2026-10-13T10:00:00.000Z",
    }).success).toBe(false);
  });
});
