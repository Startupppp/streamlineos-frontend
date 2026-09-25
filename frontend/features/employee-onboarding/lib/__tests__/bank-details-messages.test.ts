/**
 * V-035. The bank half of the same gap: the wizard's bank/statutory copy is
 * user-facing and asserted nowhere, so a refactor could reword or drop it with
 * every suite still green. No product change, only the guard.
 */
import { buildBankDetailsSchema } from "../bank-details-schema";
import type { OnboardingRequirements } from "../onboarding-requirements-schema";

const VALID = {
  accountHolder: "Ada Lovelace",
  bankName: "Example Bank",
  accountNumber: "123456789012",
  routingCode: "HDFC0001234",
  iban: "",
  swift: "",
  statutory: {},
};

function requirements(
  over: Partial<OnboardingRequirements> = {},
): OnboardingRequirements {
  return {
    countryCode: "IN",
    bankScheme: "IFSC",
    bankFields: [],
    statutoryFields: [],
    ...over,
  };
}

/** The message zod attached to `path`, or undefined. */
function messageAt(
  req: OnboardingRequirements,
  input: Record<string, unknown>,
  path: string,
): string | undefined {
  const result = buildBankDetailsSchema(req).safeParse(input);
  if (result.success) return undefined;
  return result.error.issues.find((i) => i.path.join(".") === path)?.message;
}

describe("buildBankDetailsSchema user-facing copy", () => {
  it('shows the IFSC shape rather than just rejecting: "Enter a valid IFSC code (e.g. HDFC0001234)"', () => {
    expect(
      messageAt(requirements(), { ...VALID, routingCode: "NOTANIFSC" }, "routingCode"),
    ).toBe("Enter a valid IFSC code (e.g. HDFC0001234)");
  });

  it('names the statutory field that is blank: "PAN is required"', () => {
    const req = requirements({
      statutoryFields: [
        { key: "pan", label: "PAN", placeholder: "e.g. ABCDE1234F", required: true },
      ],
    });
    expect(messageAt(req, { ...VALID, statutory: { pan: "" } }, "statutory.pan")).toBe(
      "PAN is required",
    );
  });

  it("leaves an optional statutory field alone when it is blank", () => {
    const req = requirements({
      statutoryFields: [
        { key: "pan", label: "PAN", placeholder: "e.g. ABCDE1234F", required: false },
      ],
    });
    expect(
      buildBankDetailsSchema(req).safeParse({ ...VALID, statutory: { pan: "" } }).success,
    ).toBe(true);
  });
});
