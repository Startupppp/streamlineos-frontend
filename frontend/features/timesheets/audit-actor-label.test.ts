import { auditActorLabel } from "@/features/timesheets/audit-types";

describe("auditActorLabel", () => {
  it("names the actor when the membership still resolves", () => {
    expect(auditActorLabel({ actorMembershipId: 7, actorName: "Priya" })).toBe("Priya");
  });

  it("calls a row with no actor at all the system's", () => {
    expect(auditActorLabel({ actorMembershipId: null, actorName: null })).toBe("System");
  });

  it("does not attribute a departed member's action to the system", () => {
    expect(auditActorLabel({ actorMembershipId: 7, actorName: null })).toBe("Former member");
  });
});
