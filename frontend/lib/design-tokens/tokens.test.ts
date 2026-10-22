import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DENSITY_SPACING_ROLES,
  ELEVATIONS,
  SPACING_ROLES,
  STATUS_ROLES,
  STATUS_TONES,
  TYPE_SCALE,
  statusToneClasses,
  typeScaleClass,
  statusVar,
  densityAttribute,
} from "./index";

const css = readFileSync(join(process.cwd(), "globals.css"), "utf8");

function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "");
}

function bodiesFor(selector: string): string {
  const source = withoutComments(css);
  let out = "";

  for (let i = 0; i < source.length; i += 1) {
    if (source[i] !== "{") continue;

    const headerStart = Math.max(
      source.lastIndexOf("}", i),
      source.lastIndexOf(";", i),
      -1,
    );
    if (source.slice(headerStart + 1, i).trim() !== selector) continue;

    let depth = 1;
    let j = i + 1;
    for (; j < source.length && depth > 0; j += 1) {
      if (source[j] === "{") depth += 1;
      else if (source[j] === "}") depth -= 1;
    }
    out += source.slice(i + 1, j - 1);
  }

  return out;
}

const root = bodiesFor(":root");
const dark = bodiesFor(".dark");
const themeBlocks = css.match(/@theme inline\s*\{([\s\S]*?)\n\}/g)?.join("") ?? "";

describe("design token contract", () => {
  it("declares every status token in the light palette", () => {
    const missing = STATUS_TONES.flatMap((tone) =>
      STATUS_ROLES.map((role) => statusVar(tone, role)),
    ).filter((name) => !root.includes(`${name}:`));

    expect(missing).toEqual([]);
  });

  it("gives every status token a dark pairing, so no colour is light-only", () => {
    const missing = STATUS_TONES.flatMap((tone) =>
      STATUS_ROLES.map((role) => statusVar(tone, role)),
    ).filter((name) => !dark.includes(`${name}:`));

    expect(missing).toEqual([]);
  });

  it("defines no status colour only inside the dark branch", () => {
    const darkOnly = [...dark.matchAll(/(--status-[a-z-]+):/g)]
      .map((m) => m[1])
      .filter((name) => !root.includes(`${name}:`));

    expect(darkOnly).toEqual([]);
  });

  it("gives every elevation a value in both themes", () => {
    for (const level of ELEVATIONS) {
      expect(root).toContain(`--elevation-${level}:`);
      expect(dark).toContain(`--elevation-${level}:`);
    }
  });

  it("exposes every status token as a utility, or the class helper is a lie", () => {
    const missing = STATUS_TONES.flatMap((tone) =>
      STATUS_ROLES.map((role) => `--color-status-${tone}-${role}`),
    ).filter((name) => !themeBlocks.includes(`${name}:`));

    expect(missing).toEqual([]);
  });

  it("exposes the type scale and semantic spacing as utilities", () => {
    for (const step of TYPE_SCALE) expect(themeBlocks).toContain(`--text-${step}:`);
    for (const role of SPACING_ROLES) expect(themeBlocks).toContain(`--spacing-${role}:`);
  });

  it("keeps density utilities pointing at the live variable, not a resolved value", () => {
    for (const role of DENSITY_SPACING_ROLES) {
      expect(themeBlocks).toMatch(
        new RegExp(`--spacing-${role}:\\s*var\\(--density-[a-z-]+\\)`),
      );
    }
  });

  it("defines both density modes, comfortable as the default", () => {
    for (const role of DENSITY_SPACING_ROLES) {
      expect(root).toContain(`--density-${role}:`);
    }
    expect(css).toContain('[data-density="compact"]');
    expect(css).not.toContain(':root[data-density="compact"]');
  });

  it("names a class for every status role the catalogue advertises", () => {
    const classes = statusToneClasses("success");
    expect(classes).toEqual({
      surface: "bg-status-success-surface",
      ink: "text-status-success-ink",
      inkStrong: "text-status-success-ink-strong",
      rule: "border-status-success-rule",
      fill: "bg-status-success-fill",
      fillHover: "hover:bg-status-success-fill-hover",
    });
  });

  it("has deleted the hand-written shadow classes", () => {
    const rules = css.replace(/\/\*[\s\S]*?\*\//g, " ");
    for (const legacy of [".shadow-soft", ".shadow-medium", ".shadow-noir", ".logo-gradient-sweep"])
      expect(rules).not.toContain(`${legacy} {`);
    expect(rules).not.toContain(".dark .shadow-noir");
  });

  it("keeps shadow-noir working, as a token-backed utility", () => {
    expect(css).toContain("--elevation-noir:");
    expect(css).toContain("--shadow-noir: var(--elevation-noir)");
  });

  it("declares gradient stops for every tone, in both themes", () => {
    for (const tone of STATUS_TONES) {
      expect(css).toContain(`--gradient-${tone}-from:`);
      expect(css).toContain(`--gradient-${tone}-wash-from:`);
    }
  });

  it("extends the radius scale below sm, which a checkbox needs", () => {
    expect(css).toContain("--radius-xs:");
    expect(css).toContain("--radius-2xs:");
  });

  it("declares the fill role for every tone, in both themes", () => {
    for (const tone of STATUS_TONES) {
      expect(css).toContain(`--status-${tone}-fill:`);
      expect(css).toContain(`--status-${tone}-fill-hover:`);
      expect(css).toContain(`--color-status-${tone}-fill: var(--status-${tone}-fill)`);
    }
  });

  it("writes every class as a literal, or Tailwind never generates the utility", () => {
    const source = readFileSync(join(process.cwd(), "lib/design-tokens/index.ts"), "utf8");

    for (const tone of STATUS_TONES) {
      const classes = statusToneClasses(tone);
      for (const value of Object.values(classes)) {
        expect(source).toContain(`"${value}"`);
      }
    }
    for (const step of TYPE_SCALE) {
      expect(source).toContain(`"${typeScaleClass(step)}"`);
    }
  });

  it("treats comfortable as the absence of an attribute", () => {
    expect(densityAttribute("comfortable")).toEqual({});
    expect(densityAttribute("compact")).toEqual({ "data-density": "compact" });
  });
});
