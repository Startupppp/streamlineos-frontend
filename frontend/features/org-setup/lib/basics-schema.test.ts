import {
  basicsStepSchema,
  COMPANY_NAME_MAX_LENGTH,
  INDUSTRY_MAX_LENGTH,
} from "./basics-schema";

const valid = {
  goals: ["sales"],
  industry: "IT Services",
  companyName: "Acme Corp",
  teamSize: "1-10",
  phone: "+919876543210",
};

function issueFor(field: string, input: Record<string, unknown>): string | null {
  const parsed = basicsStepSchema.safeParse(input);
  if (parsed.success) return null;
  return parsed.error.issues.find((i) => i.path[0] === field)?.message ?? null;
}

describe("basicsStepSchema", () => {
  it("accepts a complete, valid Basics step", () => {
    expect(basicsStepSchema.safeParse(valid).success).toBe(true);
  });

  // These caps mirror the backend's setupSchema. Without them the value only
  // fails at Launch, as a server error two steps from the field that caused it.
  it("accepts a company name at the backend's cap", () => {
    const companyName = "a".repeat(COMPANY_NAME_MAX_LENGTH);
    expect(issueFor("companyName", { ...valid, companyName })).toBeNull();
  });

  it("rejects a company name one character over the backend's cap", () => {
    const companyName = "a".repeat(COMPANY_NAME_MAX_LENGTH + 1);
    expect(issueFor("companyName", { ...valid, companyName })).toBe(
      `Company name must be ${COMPANY_NAME_MAX_LENGTH} characters or fewer.`,
    );
  });

  it("accepts a custom industry at the backend's cap", () => {
    const industry = "b".repeat(INDUSTRY_MAX_LENGTH);
    expect(issueFor("industry", { ...valid, industry })).toBeNull();
  });

  it("rejects a custom industry one character over the backend's cap", () => {
    const industry = "b".repeat(INDUSTRY_MAX_LENGTH + 1);
    expect(issueFor("industry", { ...valid, industry })).toBe(
      `Industry must be ${INDUSTRY_MAX_LENGTH} characters or fewer.`,
    );
  });

  it("measures the caps after trimming, as the backend does", () => {
    const companyName = `  ${"a".repeat(COMPANY_NAME_MAX_LENGTH)}  `;
    expect(issueFor("companyName", { ...valid, companyName })).toBeNull();
  });

  it("still requires each field to be present", () => {
    expect(issueFor("goals", { ...valid, goals: [] })).toBe(
      "Select at least one goal.",
    );
    expect(issueFor("companyName", { ...valid, companyName: "   " })).toBe(
      "Enter your company name.",
    );
    expect(issueFor("industry", { ...valid, industry: "" })).toBe(
      "Select or enter your industry.",
    );
    expect(issueFor("teamSize", { ...valid, teamSize: "" })).toBe(
      "Select your team size.",
    );
  });

  it("rejects a phone number that is not dialable", () => {
    expect(issueFor("phone", { ...valid, phone: "+9112345" })).toBe(
      "Enter a valid mobile number.",
    );
  });
});
