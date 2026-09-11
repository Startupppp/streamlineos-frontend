import { HEX_COLOR, brandingSchema } from "./org-branding-schema";

describe("organization branding form", () => {
  it("accepts a valid hex primary color", () => {
    expect(
      brandingSchema.safeParse({
        logo: "",
        favicon: "",
        primaryColor: "#0b1220",
        secondaryColor: "",
        loginBgUrl: "",
      }).success,
    ).toBe(true);
  });

  it("rejects a non-hex primary color", () => {
    expect(
      brandingSchema.safeParse({
        primaryColor: "red",
        secondaryColor: "",
      }).success,
    ).toBe(false);
  });

  it("rejects a 3-digit shorthand hex", () => {
    expect(
      brandingSchema.safeParse({
        primaryColor: "#abc",
        secondaryColor: "",
      }).success,
    ).toBe(false);
  });

  it("accepts an empty string for optional color fields", () => {
    expect(
      brandingSchema.safeParse({
        primaryColor: "",
        secondaryColor: "",
      }).success,
    ).toBe(true);
  });

  it("rejects an invalid URL for logo", () => {
    expect(
      brandingSchema.safeParse({
        logo: "not-a-url",
        primaryColor: "",
        secondaryColor: "",
      }).success,
    ).toBe(false);
  });

  it("accepts an empty string for logo (not required)", () => {
    expect(
      brandingSchema.safeParse({
        logo: "",
        primaryColor: "",
        secondaryColor: "",
      }).success,
    ).toBe(true);
  });

  it("accepts a valid URL for loginBgUrl", () => {
    expect(
      brandingSchema.safeParse({
        primaryColor: "",
        secondaryColor: "",
        loginBgUrl: "https://cdn.example.com/bg.jpg",
      }).success,
    ).toBe(true);
  });

  it("HEX_COLOR regex matches only 6-digit hex values", () => {
    expect(HEX_COLOR.test("#ffffff")).toBe(true);
    expect(HEX_COLOR.test("#FFFFFF")).toBe(true);
    expect(HEX_COLOR.test("#fff")).toBe(false);
    expect(HEX_COLOR.test("ffffff")).toBe(false);
    expect(HEX_COLOR.test("#gggggg")).toBe(false);
  });
});
