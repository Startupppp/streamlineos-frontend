import {
  contrastRatio,
  darkCss,
  lightCss,
  ratioOf,
  WCAG_AA_NORMAL,
  WCAG_NON_TEXT,
} from "@/test-utils/globals-css-tokens";

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

  it("muted-foreground on --muted (light) meets AA normal text — every module renders text-sm muted copy on muted surfaces", () => {
    expect(ratioOf(lightCss, "muted-foreground", "muted")).toBeGreaterThanOrEqual(
      WCAG_AA_NORMAL,
    );
  });

  it("muted-foreground on --muted (dark) meets AA normal text", () => {
    expect(ratioOf(darkCss, "muted-foreground", "muted")).toBeGreaterThanOrEqual(
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
