import { readFileSync } from "node:fs";
import { join } from "node:path";

function hexToRgb(hex: string): [number, number, number] {
  const cleaned = hex.replace("#", "");
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return [r, g, b];
}

function linearize(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (
    0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
  );
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function extractTokenValue(css: string, tokenName: string): string | undefined {
  const pattern = new RegExp(
    String.raw`--${tokenName}:\s*(#[0-9a-fA-F]{3,8})`,
  );
  const match = pattern.exec(css);
  return match?.[1];
}

const CSS_PATH = join(__dirname, "../../../globals.css");
const cssSource = readFileSync(CSS_PATH, "utf-8");

const DARK_BLOCK_START = cssSource.indexOf("\n.dark {");
const lightCss = DARK_BLOCK_START >= 0
  ? cssSource.slice(0, DARK_BLOCK_START)
  : cssSource;
const darkCss = DARK_BLOCK_START >= 0
  ? cssSource.slice(DARK_BLOCK_START)
  : "";

const WCAG_AA_NORMAL = 4.5;
const WCAG_AA_LARGE = 3.0;

interface TokenPair {
  fg: string;
  bg: string;
  label: string;
  largeTextOnly?: boolean;
}

function resolvePair(
  css: string,
  fgToken: string,
  bgToken: string,
): { fg: string; bg: string } | null {
  const fg = extractTokenValue(css, fgToken);
  const bg = extractTokenValue(css, bgToken);
  if (!fg || !bg) return null;
  return { fg, bg };
}

describe("WCAG AA contrast — light mode token pairs", () => {
  const primaryTextPairs: TokenPair[] = [
    { fg: "foreground", bg: "background", label: "foreground on background" },
    { fg: "card-foreground", bg: "card", label: "card-foreground on card" },
    {
      fg: "popover-foreground",
      bg: "popover",
      label: "popover-foreground on popover",
    },
    {
      fg: "primary-foreground",
      bg: "primary",
      label: "primary-foreground on primary",
    },
    {
      fg: "secondary-foreground",
      bg: "secondary",
      label: "secondary-foreground on secondary",
    },
    {
      fg: "destructive-foreground",
      bg: "destructive",
      label: "destructive-foreground on destructive",
    },
    {
      fg: "accent-foreground",
      bg: "accent",
      label: "accent-foreground on accent",
    },
  ];

  const secondaryTextPairs: TokenPair[] = [
    {
      fg: "muted-foreground",
      bg: "muted",
      label: "muted-foreground on muted (secondary/hint text — large-text threshold)",
      largeTextOnly: true,
    },
    {
      fg: "muted-foreground",
      bg: "background",
      label: "muted-foreground on page background (secondary text)",
      largeTextOnly: true,
    },
  ];

  for (const pair of primaryTextPairs) {
    it(`${pair.label} meets WCAG AA (${WCAG_AA_NORMAL}:1)`, () => {
      const resolved = resolvePair(lightCss, pair.fg, pair.bg);
      expect(resolved).not.toBeNull();
      if (!resolved) return;
      const ratio = contrastRatio(resolved.fg, resolved.bg);
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
    });
  }

  for (const pair of secondaryTextPairs) {
    it(`${pair.label} meets WCAG AA large-text threshold (${WCAG_AA_LARGE}:1)`, () => {
      const resolved = resolvePair(lightCss, pair.fg, pair.bg);
      expect(resolved).not.toBeNull();
      if (!resolved) return;
      const ratio = contrastRatio(resolved.fg, resolved.bg);
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_LARGE);
    });
  }
});

describe("WCAG AA contrast — dark mode token pairs", () => {
  const darkPairsAA: TokenPair[] = [
    {
      fg: "foreground",
      bg: "background",
      label: "foreground on background (dark)",
    },
    {
      fg: "card-foreground",
      bg: "card",
      label: "card-foreground on card (dark)",
    },
    {
      fg: "primary-foreground",
      bg: "primary",
      label: "primary-foreground on primary (dark)",
    },
  ];

  for (const pair of darkPairsAA) {
    it(`${pair.label} meets WCAG AA (${WCAG_AA_NORMAL}:1)`, () => {
      const resolved = resolvePair(darkCss, pair.fg, pair.bg);
      expect(resolved).not.toBeNull();
      if (!resolved) return;
      const ratio = contrastRatio(resolved.fg, resolved.bg);
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
    });
  }

  it("destructive-foreground on destructive (dark) meets WCAG AA normal text (4.5:1)", () => {
    const resolved = resolvePair(darkCss, "destructive-foreground", "destructive");
    expect(resolved).not.toBeNull();
    if (!resolved) return;
    const ratio = contrastRatio(resolved.fg, resolved.bg);
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
  });
});

describe("contrastRatio utility — self-test", () => {
  it("returns exactly 21 for pure black on pure white", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });

  it("returns exactly 1 for the same color", () => {
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
  });

  it("detects a pair that FAILS AA (ratio < 4.5)", () => {
    const failingRatio = contrastRatio("#64748b", "#f1f5f9");
    expect(failingRatio).toBeLessThan(WCAG_AA_NORMAL);
  });
});
