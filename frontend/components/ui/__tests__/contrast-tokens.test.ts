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

function collectBlocks(css: string, selector: string): string {
  const marker = `\n${selector} {`;
  const parts: string[] = [];
  let from = 0;
  for (;;) {
    const start = css.indexOf(marker, from);
    if (start < 0) break;
    let depth = 0;
    let i = start + marker.length - 1;
    const bodyStart = i + 1;
    for (; i < css.length; i += 1) {
      if (css[i] === "{") depth += 1;
      else if (css[i] === "}") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    parts.push(css.slice(bodyStart, i));
    from = i + 1;
  }
  return parts.join("\n");
}

const lightCss = collectBlocks(cssSource, ":root");
const darkCss = collectBlocks(cssSource, ".dark");

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

const STATUS_TONES = ["success", "warning", "danger", "info", "neutral"] as const;

describe("WCAG AA contrast — semantic status tokens (light)", () => {
  for (const tone of STATUS_TONES) {
    it(`--status-${tone}-ink-strong on --status-${tone}-surface meets AA normal text (4.5:1)`, () => {
      expect(
        ratioOf(lightCss, `status-${tone}-ink-strong`, `status-${tone}-surface`),
      ).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
    });
  }

  for (const tone of STATUS_TONES) {
    it(`--status-${tone}-ink on --status-${tone}-surface clears at least the 3:1 floor`, () => {
      expect(
        ratioOf(lightCss, `status-${tone}-ink`, `status-${tone}-surface`),
      ).toBeGreaterThanOrEqual(WCAG_NON_TEXT);
    });
  }

  it("records that success/warning/danger -ink are BELOW AA normal text on their own surface — -ink-strong is the AA-safe ink", () => {
    const below = STATUS_TONES.filter(
      (tone) =>
        ratioOf(lightCss, `status-${tone}-ink`, `status-${tone}-surface`) <
        WCAG_AA_NORMAL,
    );
    expect(below).toEqual(["success", "warning", "danger"]);
  });
});

describe("WCAG AA contrast — semantic status tokens (dark)", () => {
  for (const tone of ["success", "warning", "danger"] as const) {
    it(`--status-${tone}-ink on --card (dark) meets AA normal text (4.5:1)`, () => {
      expect(ratioOf(darkCss, `status-${tone}-ink`, "card")).toBeGreaterThanOrEqual(
        WCAG_AA_NORMAL,
      );
    });
  }
});

describe("WCAG AA contrast — chrome surfaces", () => {
  it("sidebar-foreground on sidebar (light) meets AA normal text", () => {
    expect(ratioOf(lightCss, "sidebar-foreground", "sidebar")).toBeGreaterThanOrEqual(
      WCAG_AA_NORMAL,
    );
  });

  it("sidebar-foreground on sidebar (dark) meets AA normal text", () => {
    expect(ratioOf(darkCss, "sidebar-foreground", "sidebar")).toBeGreaterThanOrEqual(
      WCAG_AA_NORMAL,
    );
  });

  it("muted-foreground on card (light) meets AA normal text — EmptyState/ErrorState descriptions render text-sm on --card", () => {
    expect(ratioOf(lightCss, "muted-foreground", "card")).toBeGreaterThanOrEqual(
      WCAG_AA_NORMAL,
    );
  });

  it("muted-foreground on card (dark) meets AA normal text", () => {
    expect(ratioOf(darkCss, "muted-foreground", "card")).toBeGreaterThanOrEqual(
      WCAG_AA_NORMAL,
    );
  });

  it("records that muted-foreground on --muted (light) is below AA normal text", () => {
    expect(ratioOf(lightCss, "muted-foreground", "muted")).toBeLessThan(
      WCAG_AA_NORMAL,
    );
  });
});

const LIGHT_SURFACES = ["background", "card", "muted"] as const;
const DARK_SURFACES = ["background", "card", "muted"] as const;

describe("status ink by usage class — every surface a badge or icon can land on", () => {
  describe("text class: -ink-strong is what renders words, so it owes 4.5:1", () => {
    for (const tone of STATUS_TONES) {
      it(`--status-${tone}-ink-strong clears 4.5:1 on its own surface and on background, card and muted`, () => {
        const surfaces = [`status-${tone}-surface`, ...LIGHT_SURFACES];
        for (const surface of surfaces) {
          expect(
            ratioOf(lightCss, `status-${tone}-ink-strong`, surface),
          ).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
        }
      });
    }
  });

  describe("non-text class: -ink draws icons, dots and rules, so it owes 3:1", () => {
    for (const tone of STATUS_TONES) {
      it(`--status-${tone}-ink clears 3:1 on its own surface and on background, card and muted`, () => {
        const surfaces = [`status-${tone}-surface`, ...LIGHT_SURFACES];
        for (const surface of surfaces) {
          expect(
            ratioOf(lightCss, `status-${tone}-ink`, surface),
          ).toBeGreaterThanOrEqual(WCAG_NON_TEXT);
        }
      });
    }
  });

  describe("dark mode carries both classes", () => {
    for (const tone of STATUS_TONES) {
      it(`--status-${tone}-ink-strong clears 4.5:1 on every dark surface`, () => {
        for (const surface of DARK_SURFACES) {
          expect(
            ratioOf(darkCss, `status-${tone}-ink-strong`, surface),
          ).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
        }
      });

      it(`--status-${tone}-ink clears 3:1 on every dark surface`, () => {
        for (const surface of DARK_SURFACES) {
          expect(
            ratioOf(darkCss, `status-${tone}-ink`, surface),
          ).toBeGreaterThanOrEqual(WCAG_NON_TEXT);
        }
      });
    }
  });

  it("BITE PROOF — amber-600, the value --status-warning-ink held, is below 3:1 on --muted", () => {
    expect(contrastRatio("#d97706", "#f1f5f9")).toBeLessThan(WCAG_NON_TEXT);
  });

  it("BITE PROOF — -ink is not a text ink: four of the five tones fail AA on some light surface", () => {
    const worstLightRatio = (tone: (typeof STATUS_TONES)[number]): number =>
      Math.min(
        ...[`status-${tone}-surface`, ...LIGHT_SURFACES].map((surface) =>
          ratioOf(lightCss, `status-${tone}-ink`, surface),
        ),
      );
    const belowText = STATUS_TONES.filter(
      (tone) => worstLightRatio(tone) < WCAG_AA_NORMAL,
    );
    expect(belowText).toEqual(["success", "warning", "danger", "neutral"]);
  });
});

import { resolve as resolvePath } from "node:path";
import {
  collectAlphaTextSites,
  composite,
  contrast,
  FE_ROOT,
  loadThemePalettes,
  mixSrgb,
  parseHex,
  rawToken,
  resolveToken,
  type ThemePalette,
} from "@/test-utils/theme-contrast";

/**
 * Everything above this line reads `globals.css` — the ONE palette a user sees
 * only until they pick a theme. `themes.css` carries seventeen more, each of
 * which replaces `--primary` and `--ring` outright and then rewrites every
 * neutral surface beneath them with `color-mix`. Judging the default and
 * calling the product accessible measures the palette that has no defect in
 * it, so the rest of this file judges the palettes that do.
 */
const palettes = loadThemePalettes();
const lightPalettes = palettes.filter((palette) => palette.mode === "light");

function name(palette: ThemePalette): string {
  return `${palette.id} (${palette.mode})`;
}

function ratioBetween(
  palette: ThemePalette,
  foreground: string,
  background: string,
): number {
  const fg = resolveToken(palette, foreground);
  const bg = resolveToken(palette, background);
  if (!fg || !bg)
    throw new Error(
      `${name(palette)}: cannot resolve --${foreground} (${rawToken(palette, foreground) ?? "absent"}) on --${background} (${rawToken(palette, background) ?? "absent"})`,
    );
  return contrast(fg, bg);
}

describe("the theme census sees every palette a user can select", () => {
  it("loads all seventeen selectable themes in both modes", () => {
    expect(new Set(palettes.map((palette) => palette.id)).size).toBe(17);
    expect(palettes).toHaveLength(34);
  });

  it("resolves the tinted neutrals rather than falling back to the untinted default", () => {
    const orange = lightPalettes.find((palette) => palette.id === "orange");
    expect(orange).toBeDefined();
    if (!orange) return;
    expect(rawToken(orange, "background")).toContain("color-mix");
    expect(resolveToken(orange, "background")).not.toEqual(parseHex("#f8fafc"));
  });

  it("chases a var() reference to the hex it names", () => {
    const teal = lightPalettes.find((palette) => palette.id === "teal");
    expect(teal).toBeDefined();
    if (!teal) return;
    expect(rawToken(teal, "ring")).toBe("var(--brand-deep)");
    expect(resolveToken(teal, "ring")).toEqual(parseHex("#115e59"));
  });

  it("mixes in gamma-encoded sRGB, the space CSS `in srgb` names", () => {
    expect(mixSrgb(parseHex("#ffffff")!, 50, parseHex("#000000")!)).toEqual({
      r: 128,
      g: 128,
      b: 128,
    });
  });

  it("the dark per-theme block outranks the dark tint block, as source order decides", () => {
    const darkRed = palettes.find(
      (palette) => palette.id === "red" && palette.mode === "dark",
    );
    expect(darkRed).toBeDefined();
    if (!darkRed) return;
    expect(resolveToken(darkRed, "sidebar-accent-foreground")).toEqual(
      parseHex("#fca5a5"),
    );
  });
});

describe("PRD-C138 contrast — every selectable theme, not just the default", () => {
  const AA_PAIRS: Array<[string, string]> = [
    ["primary-foreground", "primary"],
    ["secondary-foreground", "secondary"],
    ["accent-foreground", "accent"],
    ["card-foreground", "card"],
    ["foreground", "background"],
    ["muted-foreground", "card"],
    ["sidebar-foreground", "sidebar"],
    ["sidebar-accent-foreground", "sidebar"],
  ];

  for (const palette of palettes) {
    for (const [foreground, background] of AA_PAIRS) {
      it(`${name(palette)} — --${foreground} on --${background} meets AA (4.5:1)`, () => {
        expect(
          ratioBetween(palette, foreground, background),
        ).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
      });
    }
  }
});

describe("PRD-C138 focus indicator — SC 1.4.11 in every selectable theme", () => {
  const RING_SURFACES = ["background", "card", "muted", "sidebar"];

  for (const palette of palettes) {
    it(`${name(palette)} — --ring clears 3:1 on background, card, muted and sidebar`, () => {
      for (const surface of RING_SURFACES)
        expect(ratioBetween(palette, "ring", surface)).toBeGreaterThanOrEqual(
          WCAG_NON_TEXT,
        );
    });

    it(`${name(palette)} — --sidebar-ring clears 3:1 on --sidebar`, () => {
      expect(
        ratioBetween(palette, "sidebar-ring", "sidebar"),
      ).toBeGreaterThanOrEqual(WCAG_NON_TEXT);
    });
  }
});

/**
 * SCOPE, stated rather than implied. This judges `components/shared/**` — the
 * loading, empty, error and permission primitives every feature renders — and
 * nothing else. The wider corpus holds 554 more `text-<token>/<alpha>` sites
 * across `features/**`, which are NOT covered here and are not claimed to be
 * clean; they are a separate, larger population and belong to the features
 * that own them.
 */
describe("PRD-C138 alpha-composited text — the shared state primitives", () => {
  const sites = collectAlphaTextSites(resolvePath(FE_ROOT, "components/shared"));
  const SURFACES = ["background", "card", "muted"];

  it("finds the call sites it is supposed to be judging", () => {
    expect(sites.length).toBeGreaterThan(0);
  });

  it("every alpha-composited text class clears AA over every surface in every theme", () => {
    const failures: string[] = [];
    for (const site of sites) {
      for (const palette of palettes) {
        const ink = resolveToken(palette, site.token);
        if (!ink) continue;
        for (const surfaceToken of SURFACES) {
          const surface = resolveToken(palette, surfaceToken);
          if (!surface) continue;
          const ratio = contrast(composite(ink, site.alpha, surface), surface);
          if (ratio < WCAG_AA_NORMAL)
            failures.push(
              `${site.file}:${site.line} ${site.className} on --${surfaceToken} in ${name(palette)} = ${ratio.toFixed(2)}:1`,
            );
        }
      }
    }
    expect(failures).toEqual([]);
  });
});

describe("BITE PROOFS — each theme verdict is reached for the stated reason", () => {
  it("white on orange-600, the value --primary held, fails AA", () => {
    expect(contrast(parseHex("#ffffff")!, parseHex("#ea580c")!)).toBeLessThan(
      WCAG_AA_NORMAL,
    );
  });

  it("orange-500, the value --ring held, fails 3:1 on the theme's own tinted background", () => {
    const orange = lightPalettes.find((palette) => palette.id === "orange");
    expect(orange).toBeDefined();
    if (!orange) return;
    const background = resolveToken(orange, "background");
    expect(background).not.toBeNull();
    if (!background) return;
    expect(contrast(parseHex("#f97316")!, background)).toBeLessThan(
      WCAG_NON_TEXT,
    );
  });

  it("muted-foreground at 60%, the value the permission slug painted, fails AA on --muted", () => {
    const orange = lightPalettes.find((palette) => palette.id === "orange");
    expect(orange).toBeDefined();
    if (!orange) return;
    const ink = resolveToken(orange, "muted-foreground");
    const surface = resolveToken(orange, "muted");
    expect(ink).not.toBeNull();
    expect(surface).not.toBeNull();
    if (!ink || !surface) return;
    expect(contrast(composite(ink, 0.6, surface), surface)).toBeLessThan(
      WCAG_AA_NORMAL,
    );
  });

  it("compositing is not the same question as the ink's own ratio", () => {
    const orange = lightPalettes.find((palette) => palette.id === "orange");
    expect(orange).toBeDefined();
    if (!orange) return;
    const ink = resolveToken(orange, "muted-foreground");
    const surface = resolveToken(orange, "muted");
    if (!ink || !surface) return;
    expect(contrast(ink, surface)).toBeGreaterThan(
      contrast(composite(ink, 0.6, surface), surface),
    );
  });
});
