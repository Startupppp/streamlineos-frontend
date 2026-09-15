import { parseTicketPointsInput } from "./ticket-points";

describe("parseTicketPointsInput", () => {
  it.each([
    ["", null],
    ["  ", null],
    ["0", 0],
    ["8", 8],
    [" 13 ", 13],
  ])("parses %p as %p", (input, expected) => {
    expect(parseTicketPointsInput(input)).toBe(expected);
  });

  it.each(["-1", "1.5", "abc", "Infinity", "1e2.5"])(
    "rejects %p",
    (input) => {
      expect(parseTicketPointsInput(input)).toBeUndefined();
    },
  );
});
