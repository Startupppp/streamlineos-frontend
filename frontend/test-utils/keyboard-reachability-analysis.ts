import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

export function posixRelative(from: string, to: string): string {
  return relative(from, to).split(sep).join("/");
}

const FE_ROOT = resolve(__dirname, "..");

const SKIP_DIRECTORIES = new Set([
  ".next",
  ".next-buildmart",
  "node_modules",
  ".git",
  ".scratch",
  "public",
  "feedbucket-widget",
]);

/**
 * Elements the platform already makes operable from the keyboard. Everything
 * else that takes a click has to say so itself.
 */
const NATIVE_INTERACTIVE = new Set([
  "button",
  "a",
  "input",
  "select",
  "textarea",
  "summary",
  "details",
  "label",
  "option",
]);

const TAG_START = /<([a-zA-Z][a-zA-Z0-9.]*)(?=[\s/>])/g;

const CLICK_PROP = /\bonClick\s*=/;
const KEY_PROP = /\bon(?:KeyDown|KeyUp|KeyPress)\s*=/;
const SPREAD = /\{\s*\.\.\./;
/**
 * The shared helpers in `lib/keyboard-activation.ts`. A site that moves onto
 * one of them still counts toward the denominator — otherwise converting a
 * finding would shrink the population it was counted against, and the ratio
 * would improve because the question was withdrawn.
 */
const SHARED_ACTIVATION = /\bactivationProps\s*\(|\bpropagationShield\b/;

export interface ClickSite {
  file: string;
  line: number;
  tag: string;
}

export interface KeyboardReachability {
  filesScanned: number;
  /** Every lowercase-element click target in the corpus — the denominator. */
  clickSites: number;
  /** The ones a keyboard user cannot reach. */
  unreachable: ClickSite[];
}

/**
 * A JSX opening tag cannot be matched with a regex: an attribute value holds
 * arrow functions, nested braces and quoted `>` characters, and a naive match
 * ends the tag inside `(e) => {`, which reported a handled element as bare.
 * This walks the attribute region tracking brace depth and quoting instead.
 */
function readAttributes(source: string, from: number): { attributes: string; end: number } | null {
  let depth = 0;
  let quote: string | null = null;
  for (let i = from; i < source.length; i += 1) {
    const char = source[i] as string;
    if (quote !== null) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    else if (char === "}") depth -= 1;
    else if (char === ">" && depth === 0)
      return { attributes: source.slice(from, i), end: i };
    else if (char === "<" && depth === 0) return null;
  }
  return null;
}

export function baseTag(tag: string): string {
  const parts = tag.split(".");
  return parts[parts.length - 1] ?? tag;
}

export interface RawSite {
  index: number;
  tag: string;
  attributes: string;
}

export function openingTags(source: string): RawSite[] {
  const sites: RawSite[] = [];
  TAG_START.lastIndex = 0;
  let match = TAG_START.exec(source);
  while (match) {
    const read = readAttributes(source, match.index + match[0].length);
    if (read !== null)
      sites.push({ index: match.index, tag: match[1] as string, attributes: read.attributes });
    match = TAG_START.exec(source);
  }
  return sites;
}

/**
 * A click target is reachable when it is a native control, when it handles a
 * key itself, or when it takes a spread that could supply either. PascalCase
 * components are excluded: their own definition owns the contract, and this
 * scan cannot see through it.
 */
export function findUnreachableClickTargets(source: string): ClickSite[] {
  const findings: ClickSite[] = [];
  for (const site of openingTags(source)) {
    const element = baseTag(site.tag);
    if (!/^[a-z]/.test(element)) continue;
    if (!CLICK_PROP.test(site.attributes)) continue;
    if (NATIVE_INTERACTIVE.has(element)) continue;
    if (KEY_PROP.test(site.attributes)) continue;
    if (SPREAD.test(site.attributes)) continue;
    findings.push({
      file: "",
      line: source.slice(0, site.index).split("\n").length,
      tag: site.tag,
    });
  }
  return findings;
}

export function countClickSites(source: string): number {
  let total = 0;
  for (const site of openingTags(source)) {
    const element = baseTag(site.tag);
    if (
      /^[a-z]/.test(element) &&
      (CLICK_PROP.test(site.attributes) || SHARED_ACTIVATION.test(site.attributes))
    )
      total += 1;
  }
  return total;
}

export function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRECTORIES.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectSourceFiles(full, out);
    else if (full.endsWith(".tsx") && !full.endsWith(".test.tsx")) out.push(full);
  }
  return out;
}

export function analyzeKeyboardReachability(): KeyboardReachability {
  const files = collectSourceFiles(FE_ROOT);
  const unreachable: ClickSite[] = [];
  let clickSites = 0;

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    if (!CLICK_PROP.test(source) && !SHARED_ACTIVATION.test(source)) continue;
    clickSites += countClickSites(source);
    const relativePath = posixRelative(FE_ROOT, file);
    for (const finding of findUnreachableClickTargets(source))
      unreachable.push({ ...finding, file: relativePath });
  }

  return { filesScanned: files.length, clickSites, unreachable };
}

export { FE_ROOT };
