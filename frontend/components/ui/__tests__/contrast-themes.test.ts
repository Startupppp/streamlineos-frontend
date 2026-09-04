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
import { WCAG_AA_NORMAL, WCAG_NON_TEXT } from "@/test-utils/globals-css-tokens";

/**
 * `contrast-tokens.test.ts` and `contrast-status-tokens.test.ts` read
 * `globals.css` — the ONE palette a user sees only until they pick a theme. `themes.css` carries seventeen more, each of
 * which replaces `--primary` and `--ring` outright and then rewrites every
 * neutral surface beneath them with `color-mix`. Judging the default and
 * calling the product accessible measures the palette that has no defect in
 * it, so this suite judges the palettes that do.
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
