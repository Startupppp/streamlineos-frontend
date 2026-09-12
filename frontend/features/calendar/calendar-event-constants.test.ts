import { EVENT_COLORS } from "./calendar-event-constants";

describe("EVENT_COLORS", () => {
  it("gives every selectable colour a distinct swatch", () => {
    const byHex = new Map<string, string[]>();
    for (const [name, hex] of Object.entries(EVENT_COLORS)) {
      const names = byHex.get(hex);
      if (names) names.push(name);
      else byHex.set(hex, [name]);
    }
    const collisions = [...byHex.entries()]
      .filter(([, names]) => names.length > 1)
      .map(([hex, names]) => `${hex} shared by ${names.join(", ")}`);
    expect(collisions).toEqual([]);
  });

  it("keeps blue as the documented fallback", () => {
    expect(EVENT_COLORS.blue).toBeDefined();
  });
});
