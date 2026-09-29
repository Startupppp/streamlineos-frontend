import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The WCAG contrast arithmetic and the `globals.css` token reader, shared by the
 * default-palette contrast suites.
 *
 * It lives in `test-utils/` rather than beside the suites because jest's default
 * `testMatch` treats every file under `__tests__/` as a suite, and because three
 * suites now read the same tokens: judging light/dark base pairs, judging the
 * semantic status ramp, and judging the seventeen selectable themes (which uses
 * the richer resolver in `theme-contrast.ts`).
 */

export function hexToRgb(hex: string): [number, number, number] {
  const cleaned = hex.replace("#", "");
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return [r, g, b];
}

export function linearize(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (
    0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
  );
}

export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const HEX_VALUE = /^#[0-9a-fA-F]{3,8}$/;
const VAR_VALUE = /^var\(\s*--([a-zA-Z0-9-]+)\s*(?:,\s*(.+?)\s*)?\)$/;
const COLOR_MIX_VALUE =
  /^color-mix\(\s*in srgb\s*,\s*(.+?)\s+(\d+(?:\.\d+)?)%\s*,\s*(.+?)\s*\)$/;

function expandHex(hex: string): string {
  const body = hex.slice(1);
  if (body.length !== 3) return hex;
  return `#${body
    .split("")
    .map((channel) => channel + channel)
    .join("")}`;
}

function toHexChannel(value: number): string {
  return Math.round(Math.min(255, Math.max(0, value)))
    .toString(16)
    .padStart(2, "0");
}

function rawDeclaration(css: string, tokenName: string): string | undefined {
  const pattern = new RegExp(
    String.raw`(?:^|[^a-zA-Z0-9-])--${tokenName}:\s*([^;]+);`,
  );
  return pattern.exec(css)?.[1].trim();
}

export function extractTokenValue(
  css: string,
  tokenName: string,
  seen: Set<string> = new Set(),
): string | undefined {
  if (seen.has(tokenName)) return undefined;
  seen.add(tokenName);
  const raw = rawDeclaration(css, tokenName);
  return raw === undefined ? undefined : resolveCssColor(css, raw, seen);
}

function resolveCssColor(
  css: string,
  value: string,
  seen: Set<string>,
): string | undefined {
  if (HEX_VALUE.test(value)) return expandHex(value);

  const varMatch = VAR_VALUE.exec(value);
  if (varMatch) {
    const referenced = extractTokenValue(css, varMatch[1], new Set(seen));
    if (referenced) return referenced;
    return varMatch[2] ? resolveCssColor(css, varMatch[2], seen) : undefined;
  }

  const mixMatch = COLOR_MIX_VALUE.exec(value);
  if (!mixMatch) return undefined;
  const first = resolveCssColor(css, mixMatch[1], new Set(seen));
  const second = resolveCssColor(css, mixMatch[3], new Set(seen));
  if (!first || !second) return undefined;

  const weight = Number(mixMatch[2]) / 100;
  const [r1, g1, b1] = hexToRgb(first);
  const [r2, g2, b2] = hexToRgb(second);
  return `#${toHexChannel(r1 * weight + r2 * (1 - weight))}${toHexChannel(
    g1 * weight + g2 * (1 - weight),
  )}${toHexChannel(b1 * weight + b2 * (1 - weight))}`;
}

const CSS_PATH = join(__dirname, "..", "globals.css");
const cssSource = readFileSync(CSS_PATH, "utf-8");

export function collectBlocks(css: string, selector: string): string {
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

export const lightCss = collectBlocks(cssSource, ":root");
export const darkCss = collectBlocks(cssSource, ".dark");

export const WCAG_AA_NORMAL = 4.5;

export interface TokenPair {
  fg: string;
  bg: string;
  label: string;
}

export function resolvePair(
  css: string,
  fgToken: string,
  bgToken: string,
): { fg: string; bg: string } | null {
  const fg = extractTokenValue(css, fgToken);
  const bg = extractTokenValue(css, bgToken);
  if (!fg || !bg) return null;
  return { fg, bg };
}

export const WCAG_NON_TEXT = 3.0;

export function extractTokenAnyValue(css: string, tokenName: string): string | undefined {
  return extractTokenValue(css, tokenName);
}

export function ratioOf(css: string, fgToken: string, bgToken: string): number {
  const fg = extractTokenValue(css, fgToken);
  const bg = extractTokenValue(css, bgToken);
  if (!fg || !bg) throw new Error(`Token not found in CSS: ${fgToken} / ${bgToken}`);
  return contrastRatio(fg, bg);
}
