import { parseSetupDraft } from "./setup-draft-schema";

describe("parseSetupDraft", () => {
  it("round-trips a valid draft", () => {
    const draft = {
      policyId: 7,
      profile: {
        country: "IN",
        currency: "INR",
        payFrequency: "MONTHLY",
        payDay: 1,
        startMonth: "2026-04",
      },
      templateKey: "in-standard",
      templateId: 3,
      toggleOverrides: { pf: true, esi: false },
    };
    expect(parseSetupDraft(draft)).toEqual(draft);
  });

  it("returns an empty draft for non-object values", () => {
    expect(parseSetupDraft(null)).toEqual({});
    expect(parseSetupDraft("payroll-setup-draft")).toEqual({});
    expect(parseSetupDraft(42)).toEqual({});
  });

  it("returns an empty draft when a field has the wrong type", () => {
    expect(parseSetupDraft({ policyId: "7" })).toEqual({});
  });

  it("returns an empty draft for an unknown pay frequency", () => {
    expect(
      parseSetupDraft({
        profile: {
          country: "IN",
          currency: "INR",
          payFrequency: "FORTNIGHTLY",
          payDay: 1,
          startMonth: "2026-04",
        },
      }),
    ).toEqual({});
  });

  it("strips unknown keys instead of passing them through", () => {
    expect(parseSetupDraft({ policyId: 7, isAdmin: true })).toEqual({
      policyId: 7,
    });
  });

  it("accepts an empty object", () => {
    expect(parseSetupDraft({})).toEqual({});
  });
});
