import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

/**
 * The seventeen selectable interface themes, resolved the way the cascade
 * resolves them.
 *
 * `contrast-tokens.test` reads `globals.css` and nothing else, so it judges
 * exactly one palette: the untinted default. Every authenticated user who has
 * picked a theme is running a DIFFERENT palette — `themes.css` replaces
 * `--primary`, `--ring` and the sidebar accents per theme, and then rewrites
 * every neutral surface underneath them with `color-mix(in srgb, var(--brand-core) N%, …)`.
 * Judging the default and calling the product accessible is a category error:
 * the failure lives in the file the test never opens.
 *
 * WHY A RESOLVER AND NOT A REGEX. A token's value in a themed root is decided
 * by three cascade layers, and picking the wrong one silently reports a
 * passing number for a palette nobody renders:
 *
 *   light  ·  :root:not(.dark)[class*="theme-"]   (0,3,0)  wins
 *          ·  :root.theme-<id>                    (0,2,0)
 *          ·  globals :root                       (0,1,0)
 *   dark   ·  :root.dark.theme-<id>               (0,3,0)  wins on source order
 *          ·  :root.dark[class*="theme-"]         (0,3,0)
 *          ·  :root.theme-<id>                    (0,2,0)
 *          ·  globals .dark / :root
 *
 * `color-mix(in srgb, …)` interpolates in the GAMMA-ENCODED sRGB space — CSS
 * Color 5 spells the linear-light space `srgb-linear` — so the mix is a plain
 * per-channel average of the 0–255 values, and only the WCAG luminance step
 * linearizes. Mixing in the wrong space shifts every tinted surface by a few
 * percent and moves ratios across the 3:1 line.
 *
 * WHAT THIS CANNOT SEE: anything painted with an alpha modifier
 * (`text-muted-foreground/60`) composites at render time over whatever surface
 * it lands on and is judged separately; and a token whose value is a gradient,
 * an `oklch()` or a semi-transparent `color-mix` is reported unresolvable
 * rather than guessed at.
 */

const FE_ROOT = resolve(__dirname, "..");

export type ThemeMode = "light" | "dark";

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const VAR_REFERENCE = /^var\(\s*--([a-zA-Z0-9-]+)\s*\)$/;
const COLOR_MIX =
  /^color-mix\(\s*in srgb\s*,\s*(.+?)\s+(\d+(?:\.\d+)?)%\s*,\s*(.+?)\s*\)$/;

export function parseHex(value: string): Rgb | null {
  if (!HEX.test(value)) return null;
  let hex = value.slice(1);
  if (hex.length === 3)
    hex = hex
      .split("")
      .map((channel) => channel + channel)
      .join("");
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

function linearize(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(color: Rgb): number {
  return (
    0.2126 * linearize(color.r) +
    0.7152 * linearize(color.g) +
    0.0722 * linearize(color.b)
  );
}

export function contrast(a: Rgb, b: Rgb): number {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

export function mixSrgb(a: Rgb, percent: number, b: Rgb): Rgb {
  const weight = percent / 100;
  const channel = (x: number, y: number): number =>
    Math.round(x * weight + y * (1 - weight));
  return {
    r: channel(a.r, b.r),
    g: channel(a.g, b.g),
    b: channel(a.b, b.b),
  };
}

export function composite(foreground: Rgb, alpha: number, background: Rgb): Rgb {
  return mixSrgb(foreground, alpha * 100, background);
}

function blockBodies(css: string, selector: string): string[] {
  const marker = `${selector} {`;
  const bodies: string[] = [];
  let from = 0;
  for (;;) {
    const start = css.indexOf(marker, from);
    if (start < 0) break;
    const before = start === 0 ? "\n" : css[start - 1];
    if (before !== "\n") {
      from = start + marker.length;
      continue;
    }
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
    bodies.push(css.slice(bodyStart, i));
    from = i + 1;
  }
  return bodies;
}

function declarations(body: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const match of body.matchAll(/--([a-zA-Z0-9-]+)\s*:\s*([^;]+);/g))
    map.set(match[1], match[2].trim());
  return map;
}

/**
 * The cascade layers, most specific first. A layer is a flat token map; the
 * first layer that declares a token owns it, which is what the browser does
 * once specificity and source order have been settled above.
 */
export interface ThemePalette {
  id: string;
  mode: ThemeMode;
  layers: Map<string, string>[];
}

export function loadThemePalettes(
  themesPath = resolve(FE_ROOT, "themes.css"),
  globalsPath = resolve(FE_ROOT, "globals.css"),
): ThemePalette[] {
  const themes = readFileSync(themesPath, "utf8");
  const globals = readFileSync(globalsPath, "utf8");

  const globalRoot = declarations(blockBodies(globals, ":root").join("\n"));
  const globalDark = declarations(blockBodies(globals, ".dark").join("\n"));
  const lightTint = declarations(
    blockBodies(themes, ':root:not(.dark)[class*="theme-"]').join("\n"),
  );
  const darkTint = declarations(
    blockBodies(themes, ':root.dark[class*="theme-"]').join("\n"),
  );

  const ids = [
    ...new Set(
      [...themes.matchAll(/:root\.theme-([a-z]+)\s*\{/g)].map(
        (match) => match[1],
      ),
    ),
  ];

  const palettes: ThemePalette[] = [];
  for (const id of ids) {
    const base = declarations(
      blockBodies(themes, `:root.theme-${id}`).join("\n"),
    );
    const darkOverride = declarations(
      blockBodies(themes, `:root.dark.theme-${id}`).join("\n"),
    );
    palettes.push({ id, mode: "light", layers: [lightTint, base, globalRoot] });
    palettes.push({
      id,
      mode: "dark",
      layers: [darkOverride, darkTint, base, globalDark, globalRoot],
    });
  }
  return palettes;
}

export function rawToken(
  palette: ThemePalette,
  token: string,
): string | undefined {
  for (const layer of palette.layers) {
    const value = layer.get(token);
    if (value !== undefined) return value;
  }
  return undefined;
}

export function resolveToken(
  palette: ThemePalette,
  token: string,
  seen: Set<string> = new Set(),
): Rgb | null {
  if (seen.has(token)) return null;
  seen.add(token);
  const raw = rawToken(palette, token);
  if (raw === undefined) return null;
  return resolveValue(palette, raw, seen);
}

function resolveValue(
  palette: ThemePalette,
  value: string,
  seen: Set<string>,
): Rgb | null {
  const direct = parseHex(value);
  if (direct) return direct;

  const reference = VAR_REFERENCE.exec(value);
  if (reference) return resolveToken(palette, reference[1], seen);

  const mix = COLOR_MIX.exec(value);
  if (mix) {
    const source = resolveValue(palette, mix[1], new Set(seen));
    const base = resolveValue(palette, mix[3], new Set(seen));
    if (!source || !base) return null;
    return mixSrgb(source, Number(mix[2]), base);
  }
  return null;
}

export { FE_ROOT };

/**
 * Alpha-composited text, which no token pair can see.
 *
 * `text-muted-foreground/60` is not `--muted-foreground`: Tailwind paints it
 * at 60% opacity, so the pixels the reader actually sees are a composite of
 * the ink and whatever surface is behind it. A token-pair test reads the token
 * and reports the ink's own ratio — a number that is never painted anywhere.
 * The composite is what WCAG measures, so the composite is what this returns.
 *
 * The surface is not knowable statically, so a call site is judged against the
 * WORST of the surfaces a shared primitive can be dropped onto. That is the
 * right default for a design-system component precisely because its author
 * does not choose where it lands.
 */
export interface AlphaTextSite {
  file: string;
  line: number;
  token: string;
  alpha: number;
  className: string;
}

const ALPHA_TEXT = /\btext-([a-z][a-z0-9-]*)\/(\d{1,3})\b/g;
const SOURCE_EXTENSIONS = [".tsx", ".ts"];

export function collectAlphaTextSites(directory: string): AlphaTextSite[] {
  const sites: AlphaTextSite[] = [];
  const walk = (current: string): void => {
    for (const entry of readdirSync(current)) {
      const path = join(current, entry);
      if (statSync(path).isDirectory()) {
        walk(path);
        continue;
      }
      if (!SOURCE_EXTENSIONS.some((extension) => entry.endsWith(extension)))
        continue;
      if (entry.includes(".test.")) continue;
      const source = readFileSync(path, "utf8");
      const lines = source.split("\n");
      lines.forEach((text, index) => {
        for (const match of text.matchAll(ALPHA_TEXT))
          sites.push({
            file: relative(FE_ROOT, path),
            line: index + 1,
            token: match[1],
            alpha: Number(match[2]) / 100,
            className: match[0],
          });
      });
    }
  };
  walk(directory);
  return sites;
}
