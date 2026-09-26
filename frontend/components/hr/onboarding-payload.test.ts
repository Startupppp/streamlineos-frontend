/**
 * HRMS-E2E-027 reproduced on the frontend write path.
 *
 * The onboarding wizard applied a `toTitleCase` to `firstName` and `lastName`
 * before the mutation, so "McDonald" was stored as "Mcdonald" and "QA" as "Qa".
 * The backend never altered a name — `dto/employee-name-verbatim.spec.ts` pins
 * that — which is why the earlier pass closed the ticket as not-reproduced after
 * reading the server only. The transform was here, on the client, on write.
 *
 * Names are now passed through verbatim. The designation, which the product does
 * normalise, goes through `titleCaseLabel`, whose own rule keeps an acronym
 * intact without an allow-list to maintain.
 */
import { buildOnboardEmployeePayload } from "./onboarding-payload";

const base = {
  firstName: "McDonald",
  lastName: "O'Brien-Smith",
  designation: "devops engineer",
  email: "a@b.test",
};

describe("buildOnboardEmployeePayload", () => {
  it("passes an internal capital in a first name through verbatim", () => {
    expect(buildOnboardEmployeePayload(base).firstName).toBe("McDonald");
  });

  it("passes an initialism in a first name through verbatim", () => {
    expect(buildOnboardEmployeePayload({ ...base, firstName: "QA" }).firstName).toBe("QA");
  });

  it("passes a hyphen-and-apostrophe last name through verbatim", () => {
    expect(buildOnboardEmployeePayload(base).lastName).toBe("O'Brien-Smith");
  });

  it("leaves a deliberately lower-case name alone", () => {
    expect(buildOnboardEmployeePayload({ ...base, firstName: "van der" }).firstName).toBe("van der");
  });

  it("still title-cases the designation", () => {
    expect(buildOnboardEmployeePayload({ ...base, designation: "senior engineer" }).designation).toBe(
      "Senior Engineer",
    );
  });

  it("keeps an acronym in the designation without an allow-list", () => {
    expect(buildOnboardEmployeePayload({ ...base, designation: "DevOps engineer" }).designation).toBe(
      "DevOps Engineer",
    );
    expect(buildOnboardEmployeePayload({ ...base, designation: "QA lead" }).designation).toBe("QA Lead");
  });

  it("carries every other field through untouched", () => {
    expect(buildOnboardEmployeePayload(base).email).toBe("a@b.test");
  });
});

describe("buildOnboardEmployeePayload — reporting managers (HRM-15)", () => {
  const ref = { userId: "u-m", name: "Maya", email: null, designation: null, state: "active" as const };

  it("omits a blank primary manager so the backend applies the policy", () => {
    const payload = buildOnboardEmployeePayload({
      ...base,
      reportingManagerUserId: "",
      secondaryManagers: [],
      policyDefaultPrimary: { userId: "u-d", name: "Dana Default" },
    });
    expect(payload).not.toHaveProperty("reportingManagerUserId");
    expect(payload).not.toHaveProperty("secondaryManagers");
    expect(payload).not.toHaveProperty("policyDefaultPrimary");
  });

  it("sends the chosen managers and never the display refs", () => {
    const payload = buildOnboardEmployeePayload({
      ...base,
      reportingManagerUserId: "u-m",
      reportingManagerRef: ref,
      secondaryManagers: [
        { managerUserId: "u-s", label: " Project ", managerRef: ref },
        { managerUserId: "u-t", label: "" },
        { managerUserId: "" },
      ],
    });
    expect(payload).toMatchObject({
      reportingManagerUserId: "u-m",
      secondaryManagers: [{ managerUserId: "u-s", label: "Project" }, { managerUserId: "u-t" }],
    });
    expect(payload).not.toHaveProperty("reportingManagerRef");
    expect(JSON.stringify(payload)).not.toContain("managerRef");
  });

  it("sends no manager at all for a top-level role", () => {
    const payload = buildOnboardEmployeePayload({
      ...base,
      topLevelRole: true,
      topLevelRoleReason: "Founder",
      reportingManagerUserId: "u-m",
      secondaryManagers: [{ managerUserId: "u-s" }],
    });
    expect(payload).not.toHaveProperty("reportingManagerUserId");
    expect(payload).not.toHaveProperty("secondaryManagers");
    expect(payload).toMatchObject({ topLevelRole: true, topLevelRoleReason: "Founder" });
  });
});
