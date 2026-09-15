import { isDateOutsideBounds } from "./date-constraints";

describe("date picker bounds", () => {
  const from = new Date(2026, 8, 20);
  const to = new Date(2026, 8, 25);

  it.each([
    [new Date(2026, 8, 19), true],
    [new Date(2026, 8, 20), false],
    [new Date(2026, 8, 23), false],
    [new Date(2026, 8, 25), false],
    [new Date(2026, 8, 26), true],
  ])("classifies %s against inclusive bounds", (date, expected) => {
    expect(isDateOutsideBounds(date, from, to)).toBe(expected);
  });
});
