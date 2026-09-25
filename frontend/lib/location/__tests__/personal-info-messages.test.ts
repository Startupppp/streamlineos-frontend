/**
 * V-035. Seven validation strings on the onboarding personal-info step were
 * user-facing and asserted nowhere, so a refactor could reword or drop any of
 * them and every suite would stay green. These pin the exact copy and the
 * exact field it lands on — no product change, only the guard.
 */
import { personalInfoSchema } from "../personal-info-validation";

const VALID = {
  phone: "+919876543210",
  gender: "MALE" as const,
  dateOfBirth: "1990-01-01",
  emergencyName: "Ada Lovelace",
  emergencyRelation: "Parent",
  emergencyPhone: "+919876543211",
};

/** The message zod attached to `path`, or undefined. */
function messageAt(input: Record<string, unknown>, path: string): string | undefined {
  const result = personalInfoSchema.safeParse(input);
  if (result.success) return undefined;
  return result.error.issues.find((i) => i.path.join(".") === path)?.message;
}

describe("personalInfoSchema user-facing copy", () => {
  it('asks for a relationship by name when emergencyRelation is absent: "Please select a relationship"', () => {
    const { emergencyRelation: _omitted, ...withoutRelation } = VALID;
    expect(messageAt(withoutRelation, "emergencyRelation")).toBe(
      "Please select a relationship",
    );
  });

  it('explains why a street line is suddenly required: "Street address is required when adding a home address"', () => {
    expect(
      messageAt(
        {
          ...VALID,
          addressCountry: "India",
          addressState: "Karnataka",
          addressCity: "Bengaluru",
          addressPostalCode: "560001",
          addressLine1: "",
        },
        "addressLine1",
      ),
    ).toBe("Street address is required when adding a home address");
  });

  it('names the missing state: "Select a state"', () => {
    expect(
      messageAt(
        {
          ...VALID,
          addressCountry: "India",
          addressCity: "Bengaluru",
        },
        "addressState",
      ),
    ).toBe("Select a state");
  });

  it('names the missing city: "Select a city"', () => {
    expect(
      messageAt(
        {
          ...VALID,
          addressCountry: "India",
          addressState: "Karnataka",
        },
        "addressCity",
      ),
    ).toBe("Select a city");
  });

  it('names the missing PIN code: "Enter a valid PIN code"', () => {
    expect(
      messageAt(
        {
          ...VALID,
          addressCountry: "India",
          addressState: "Karnataka",
          addressCity: "Bengaluru",
          addressLine1: "12 MG Road",
        },
        "addressPostalCode",
      ),
    ).toBe("Enter a valid PIN code");
  });

  it('names the missing country before anything else: "Select a country"', () => {
    expect(messageAt({ ...VALID, addressCity: "Bengaluru" }, "addressCountry")).toBe(
      "Select a country",
    );
  });

  it('says a city must come from the chosen state\'s list, not merely be non-empty', () => {
    expect(
      messageAt(
        {
          ...VALID,
          addressCountry: "India",
          addressState: "Karnataka",
          addressCity: "Patna",
          addressPostalCode: "560001",
          addressLine1: "12 MG Road",
        },
        "addressCity",
      ),
    ).toBe("Select a city from the list for the chosen state");
  });

  it("raises none of them when no address field is touched at all", () => {
    expect(personalInfoSchema.safeParse(VALID).success).toBe(true);
  });
});
