import { awaitsMyDecision } from "./self-approval";
import { itemAwaitsMyDecision, type ActionCenterItem } from "@/features/hr/action-center/queue-item";

describe("one definition of 'awaiting my decision' for the leaves tab and the Action Center (HR-U-003)", () => {
  it("counts someone else's request", () => {
    expect(awaitsMyDecision("user_other", "user_me", false)).toBe(true);
  });

  it("leaves out the viewer's own request when another approver must decide it", () => {
    expect(awaitsMyDecision("user_me", "user_me", false)).toBe(false);
  });

  it("keeps the viewer's own request when they are its sole approver", () => {
    expect(awaitsMyDecision("user_me", "user_me", true)).toBe(true);
  });

  it("maps Action Center sources to the approval route kind they are decided under", () => {
    const seen: [string | null, string | null | undefined][] = [];
    const awaits = (kind: string | null, requester: string | null | undefined) => {
      seen.push([kind, requester]);
      return true;
    };
    const item = (source: ActionCenterItem["source"]): ActionCenterItem => ({
      id: `${source}-1`,
      source,
      sourceId: 1,
      facet: "other",
      type: source,
      requester: { userId: "user_me", name: "Me", email: null, image: null },
      requesterLabel: "Me",
      dateRange: "",
      startDay: null,
      submittedAt: null,
      policyNote: null,
      deadlineAffected: false,
      detailHref: null,
    });
    itemAwaitsMyDecision(item("leave"), awaits);
    itemAwaitsMyDecision(item("attendance"), awaits);
    itemAwaitsMyDecision(item("wfh"), awaits);
    expect(seen).toEqual([
      ["leave", "user_me"],
      ["attendance_correction", "user_me"],
      [null, "user_me"],
    ]);
  });
});
