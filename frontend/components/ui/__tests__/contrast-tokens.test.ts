import {
  contrastRatio,
  darkCss,
  lightCss,
  resolvePair,
  WCAG_AA_NORMAL,
  type TokenPair,
} from "@/test-utils/globals-css-tokens";

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
    {
      fg: "muted-foreground",
      bg: "muted",
      label:
        "muted-foreground on muted (text-sm secondary text on a muted surface is normal text)",
    },
    {
      fg: "muted-foreground",
      bg: "background",
      label: "muted-foreground on page background (secondary text)",
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
    {
      fg: "muted-foreground",
      bg: "muted",
      label: "muted-foreground on muted (dark)",
    },
    {
      fg: "muted-foreground",
      bg: "background",
      label: "muted-foreground on background (dark)",
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

const WCAG_NON_TEXT = 3.0;

function extractTokenAnyValue(css: string, tokenName: string): string | undefined {
  const direct = new RegExp(String.raw`--${tokenName}:\s*(#[0-9a-fA-F]{3,8})`).exec(css);
  if (direct) return direct[1];
  const viaVar = new RegExp(
    String.raw`--${tokenName}:\s*var\([^,]+,\s*(#[0-9a-fA-F]{3,8})\s*\)`,
  ).exec(css);
  return viaVar?.[1];
}

function ratioOf(css: string, fgToken: string, bgToken: string): number {
  const fg = extractTokenAnyValue(css, fgToken);
  const bg = extractTokenAnyValue(css, bgToken);
  expect(fg).toBeDefined();
  expect(bg).toBeDefined();
  return contrastRatio(fg as string, bg as string);
}

describe("WCAG 2.2 SC 1.4.11 — focus indicator contrast (3:1 non-text)", () => {
  const lightRingSurfaces = ["background", "card", "muted"];

  for (const surface of lightRingSurfaces) {
    it(`--ring on --${surface} (light) reaches 3:1`, () => {
      expect(ratioOf(lightCss, "ring", surface)).toBeGreaterThanOrEqual(
        WCAG_NON_TEXT,
      );
    });
  }

  it("--sidebar-ring on --sidebar (light) reaches 3:1", () => {
    expect(ratioOf(lightCss, "sidebar-ring", "sidebar")).toBeGreaterThanOrEqual(
      WCAG_NON_TEXT,
    );
  });

  it("--ring on --background (dark) reaches 3:1", () => {
    expect(ratioOf(darkCss, "ring", "background")).toBeGreaterThanOrEqual(
      WCAG_NON_TEXT,
    );
  });

  it("BITE PROOF — slate-400, the value --ring held before this was measured, is below 3:1", () => {
    expect(contrastRatio("#94a3b8", "#f8fafc")).toBeLessThan(WCAG_NON_TEXT);
  });
});
