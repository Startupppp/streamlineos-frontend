import { parseFlag } from "./auth-providers";

describe("parseFlag", () => {
  it.each<[string | undefined, boolean]>([
    ["false", false],
    ["0", false],
    ["", false],
    [undefined, false],
    ["FALSE", false],
    [" true ", true],
    ["1", true],
    ["yes", true],
    ["YES", true],
    ["True", true],
  ])("parseFlag(%p) returns %s", (input, expected) => {
    expect(parseFlag(input)).toBe(expected);
  });
});
