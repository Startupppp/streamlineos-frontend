import {
  EVENT_CATEGORY_COLORS,
  EVENT_COLORS,
  EVENT_INK,
} from "./calendar-event-constants";

const WCAG_AA_NORMAL_TEXT = 4.5;

function channel(value: number): number {
  const srgb = value / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) throw new Error(`not a six-digit hex colour: ${hex}`);
  const digits = match[1];
  const r = channel(parseInt(digits.slice(0, 2), 16));
  const g = channel(parseInt(digits.slice(2, 4), 16));
  const b = channel(parseInt(digits.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

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

  it("carries the event label at WCAG AA over every chip fill", () => {
    const failures = Object.entries({
      ...EVENT_COLORS,
      ...EVENT_CATEGORY_COLORS,
    })
      .map(([name, hex]) => ({ name, hex, ratio: contrastRatio(hex, EVENT_INK) }))
      .filter((entry) => entry.ratio < WCAG_AA_NORMAL_TEXT)
      .map(
        (entry) =>
          `${entry.name} ${entry.hex} renders ${EVENT_INK} at ${entry.ratio.toFixed(2)}:1`,
      );
    expect(failures).toEqual([]);
  });

  it("computes the ratio the way WCAG does", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5);
    expect(contrastRatio("#3b82f6", EVENT_INK)).toBeLessThan(WCAG_AA_NORMAL_TEXT);
  });
});
