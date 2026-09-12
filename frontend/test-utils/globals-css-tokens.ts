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

export function extractTokenValue(css: string, tokenName: string): string | undefined {
  const pattern = new RegExp(
    String.raw`--${tokenName}:\s*(#[0-9a-fA-F]{3,8})`,
  );
  const match = pattern.exec(css);
  return match?.[1];
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
  const direct = new RegExp(String.raw`--${tokenName}:\s*(#[0-9a-fA-F]{3,8})`).exec(css);
  if (direct) return direct[1];
  const viaVar = new RegExp(
    String.raw`--${tokenName}:\s*var\([^,]+,\s*(#[0-9a-fA-F]{3,8})\s*\)`,
  ).exec(css);
  return viaVar?.[1];
}

export function ratioOf(css: string, fgToken: string, bgToken: string): number {
  const fg = extractTokenAnyValue(css, fgToken);
  const bg = extractTokenAnyValue(css, bgToken);
  if (!fg || !bg) throw new Error(`Token not found in CSS: ${fgToken} / ${bgToken}`);
  return contrastRatio(fg, bg);
}
