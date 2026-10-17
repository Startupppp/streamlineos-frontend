import { parseTicketPointsInput } from "./ticket-points";
import { MAX_TICKET_POINTS } from "@/lib/validation/projects";

describe("parseTicketPointsInput", () => {
  it.each([
    ["", null],
    ["  ", null],
    ["0", 0],
    ["8", 8],
    [" 13 ", 13],
    ["100", MAX_TICKET_POINTS],
  ])("parses %p as %p", (input, expected) => {
    expect(parseTicketPointsInput(input)).toBe(expected);
  });

  it.each(["-1", "1.5", "abc", "Infinity", "1e2.5", "1e2", "1e9", "101"])(
    "rejects %p",
    (input) => {
      expect(parseTicketPointsInput(input)).toBeUndefined();
    },
  );
});
