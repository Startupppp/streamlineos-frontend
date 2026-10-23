import { paletteSearchWindow } from "./palette-calendar-group";

const MAX_SPAN_MS = 120 * 24 * 60 * 60 * 1000;

describe("the command palette calendar search window", () => {
  it("never spans more than the 120 days the API accepts, even when it crosses a daylight saving change", () => {
    const window = paletteSearchWindow(new Date("2026-10-24T12:00:00Z"));

    expect(new Date(window.end).getTime() - new Date(window.start).getTime()).toBe(MAX_SPAN_MS);
  });
});
