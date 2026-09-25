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
