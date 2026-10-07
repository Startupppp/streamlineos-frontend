import { resolveWizardMemberLabel } from "./resolve-wizard-member-label";
import type { WizardMember } from "./use-wizard-members";

const MEMBERS: WizardMember[] = [
  {
    userId: "u1",
    name: "Alice Smith",
    email: "alice@example.com",
    image: null,
  },
];

const SESSION = {
  id: "e05cd989-3dbb-41f0-a6aa-eb36c33c9c8a",
  name: "sosec237732",
  email: "sosec237732@maxxspace.com",
};

describe("resolveWizardMemberLabel", () => {
  it("returns No manager when manager id is unset", () => {
    expect(resolveWizardMemberLabel("", MEMBERS, SESSION, "No manager")).toBe(
      "No manager",
    );
    expect(resolveWizardMemberLabel(undefined, MEMBERS, SESSION)).toBe(
      "No manager",
    );
  });

  it("returns the directory display name when the id is present", () => {
    expect(resolveWizardMemberLabel("u1", MEMBERS, SESSION)).toBe("Alice Smith");
  });

  it("falls back to the session name when the default lead id misses the directory", () => {
    expect(resolveWizardMemberLabel(SESSION.id, [], SESSION)).toBe("sosec237732");
  });

  it("falls back to the email local-part when session name is empty", () => {
    expect(
      resolveWizardMemberLabel(SESSION.id, [], {
        id: SESSION.id,
        name: null,
        email: "sosec237732@maxxspace.com",
      }),
    ).toBe("sosec237732");
  });

  it("returns Unknown member for a foreign id that is not in the directory", () => {
    expect(
      resolveWizardMemberLabel("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", [], SESSION),
    ).toBe("Unknown member");
  });
});
