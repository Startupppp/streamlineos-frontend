import { isImplausiblePhone, nationalDigitsOf } from "@/lib/implausible-phone";

describe("implausible phone numbers", () => {
  describe("nationalDigitsOf", () => {
    it.each([
      ["+91 98765 43210", "9876543210"],
      ["+919876543210", "9876543210"],
      ["09876543210", "9876543210"],
      ["9876543210", "9876543210"],
      ["+91-98765-43210", "9876543210"],
    ])("reduces %s to its national digits", (input, expected) => {
      expect(nationalDigitsOf(input)).toBe(expected);
    });
  });

  describe("placeholders", () => {
    it.each([
      "9999999999",
      "+919999999999",
      "0000000000",
      "1111111111",
      "+91 88888 88888".replace(/\s/g, ""),
    ])("refuses %s, which is one digit repeated", (value) => {
      expect(isImplausiblePhone(value)).toBe(true);
    });

    it.each(["1234567890", "9876543210", "+911234567890"])(
      "accepts %s, a run the numbering plan can still allocate",
      (value) => {
        expect(isImplausiblePhone(value)).toBe(false);
      },
    );
  });

  describe("real numbers", () => {
    it.each([
      "+919845098450",
      "9845012345",
      "+918123456780",
      "7012345679",
      "+91 99880 12345",
    ])("accepts %s", (value) => {
      expect(isImplausiblePhone(value)).toBe(false);
    });

    it("accepts a number with a repeated run that is not the whole number", () => {
      expect(isImplausiblePhone("9999012345")).toBe(false);
    });
  });

  describe("edges", () => {
    it("has no opinion about a blank field, which is what optional means", () => {
      expect(isImplausiblePhone("")).toBe(false);
      expect(isImplausiblePhone(null)).toBe(false);
      expect(isImplausiblePhone(undefined)).toBe(false);
    });

    it("has no opinion about something too short to judge", () => {
      expect(isImplausiblePhone("1111")).toBe(false);
    });
  });
});
