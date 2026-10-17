import { getUserDisplayName, getUserInitials, normalizeNamePart } from "./person-display";

/**
 * Ticket 07. One precedence for every surface, matching the backend's
 * `resolvePersonDisplayName`. The directory card composed first+last itself while
 * this helper preferred the account name, so the same person could read one way
 * on a card and another in the table, the CSV and the profile PDF.
 */
describe("getUserDisplayName", () => {
  it("prefers the name the person chose over the composed first and last", () => {
    expect(
      getUserDisplayName({
        name: "Ada B. Lovelace",
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.test",
      }),
    ).toBe("Ada B. Lovelace");
  });

  it("composes first and last when no chosen name is stored", () => {
    expect(
      getUserDisplayName({ firstName: "Ada", lastName: "Lovelace", email: "ada@example.test" }),
    ).toBe("Ada Lovelace");
  });

  it("uses a single given part rather than leaving a stray space", () => {
    expect(getUserDisplayName({ firstName: "Prince" })).toBe("Prince");
    expect(getUserDisplayName({ lastName: "Rao" })).toBe("Rao");
  });

  it("falls back to the address, then names the absence", () => {
    expect(getUserDisplayName({ email: "ada@example.test" })).toBe("ada");
    expect(getUserDisplayName({})).toBe("Unknown");
    expect(getUserDisplayName(null)).toBe("Unassigned");
  });

  it("collapses whitespace instead of rendering a double space", () => {
    expect(getUserDisplayName({ firstName: "Ada  ", lastName: " Byron   Lovelace" })).toBe(
      "Ada Byron Lovelace",
    );
    expect(getUserDisplayName({ name: "Ada ​Lovelace" })).toBe("Ada Lovelace");
  });

  it.each([
    "QA",
    "McDonald",
    "van der Berg",
    "O'Brien",
    "de Souza-Silva",
    "RAJENDRAN",
  ])("leaves %s exactly as written", (name) => {
    expect(getUserDisplayName({ firstName: name, lastName: "Test" })).toBe(`${name} Test`);
    expect(normalizeNamePart(name)).toBe(name);
  });
});

describe("getUserInitials", () => {
  it("takes one letter from each directory part", () => {
    expect(getUserInitials({ firstName: "van der Berg", lastName: "de Souza" })).toBe("VD");
  });

  it("falls back to the display name's first two words", () => {
    expect(getUserInitials({ name: "Ada Lovelace" })).toBe("AL");
  });

  it("never renders an empty badge", () => {
    // A nameless person falls through to the "Unknown" display name.
    expect(getUserInitials({})).toBe("U");
    expect(getUserInitials(null)).toBe("?");
  });
});
