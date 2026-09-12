import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { formatMoney as formatMajor, type MoneyDisplay } from "./format-utils";
import { formatMinorMoney as formatMinor } from "./accounting/money";

/**
 * TWO MONEY FORMATTERS EXIST ON PURPOSE, AND THAT IS THE HAZARD.
 *
 * This codebase stores money two ways, and both are correct for what they hold:
 *
 *   - The accounting/GL kernel uses integer minor units — `bigint("debit_minor")`,
 *     `bigint("amount_minor")`, 123 columns, every one of them NAMED `*Minor`.
 *     `lib/accounting/money.ts#formatMinorMoney(minor, currency)` renders those.
 *   - Timesheets, HR and payroll use `decimal(precision, scale: 2)` — 74 columns,
 *     already in major units. `lib/format-utils.ts#formatMoney(value, display)`
 *     renders those.
 *
 * So "unify the two money formatters" is the WRONG fix, and this file exists
 * partly to say so where someone proposing it will see it: collapsing them would
 * make one of the two families render 100x wrong. What is missing is not a merge,
 * it is a pin. Nothing asserted that the two disagree, and nothing checked that a
 * minor-unit value never reaches the major-unit formatter.
 *
 * The type system already catches the simplest mistake — the second parameter is
 * a `MoneyDisplay` object on one and a currency `string` on the other, so
 * swapping the IMPORT is a compile error. What it cannot catch is a correct
 * import fed the wrong VALUE, because both take `number` first. That is the gap
 * these tests cover.
 *
 * `features/payroll/**` is deliberately NOT censused. It has a third `formatMoney`
 * (`features/payroll/shared/payroll-format.ts`, major units) and it belongs to
 * another owner; a failing assertion of ours over their tree would block their
 * work. Their function is the genuinely dangerous one — its signature
 * `(amount, currency: string)` is shape-identical to the minor-unit one — but
 * saying so is their call to act on, not ours to enforce.
 */

const REPO = join(__dirname, "..");
const SCAN_ROOTS = ["app", "components", "features", "lib", "hooks"];
const EXCLUDED = ["features/payroll"];

function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      if (entry === "node_modules" || entry === ".next") continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
    }
  };
  for (const root of SCAN_ROOTS) walk(join(REPO, root));
  return out.filter((f) => !EXCLUDED.some((e) => relative(REPO, f).startsWith(e)));
}

/**
 * Comments are blanked, not removed, so any line number we report still points
 * at the real line. This file's own prose names `debit_minor` and `amount_minor`
 * beside the word formatMoney; a raw-text scan would match this docblock and
 * report the guard itself as a violation.
 */
function codeOnly(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, " "));
}

/** First argument of a call, with nesting respected — a regex cannot do this. */
function firstArgument(src: string, openParen: number): string {
  let depth = 0;
  for (let i = openParen; i < src.length; i++) {
    const ch = src[i];
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") {
      depth--;
      if (depth === 0) return src.slice(openParen + 1, i);
    } else if (ch === "," && depth === 1) return src.slice(openParen + 1, i);
  }
  return "";
}

type Call = { file: string; line: number; arg: string; major: boolean };

function moneyCalls(): Call[] {
  const calls: Call[] = [];
  for (const file of sourceFiles()) {
    const raw = readFileSync(file, "utf8");
    if (!/format(?:Minor)?Money/.test(raw)) continue;
    const src = codeOnly(raw);
    const major = /from "@\/lib\/format-utils"/.test(src) && /formatMoney/.test(src);
    const minor = /from "@\/lib\/accounting\/money"/.test(src);
    if (!major && !minor) continue;
    const re = /\bformat(?:Minor)?Money(?:Compact)?\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) {
      const open = m.index + m[0].length - 1;
      calls.push({
        file: relative(REPO, file),
        line: src.slice(0, m.index).split("\n").length,
        arg: firstArgument(src, open),
        major,
      });
    }
  }
  return calls;
}

const MINOR_VALUE = /\b\w*(?:Minor|Cents)\b|\b(?:minor|cents)\b/;
const CONVERTS_DOWN = /\/\s*100\b|minorToMajor\s*\(/;

describe("the major and minor money formatters disagree by exactly 100x, on purpose", () => {
  const INR: MoneyDisplay = { currency: "INR", locale: "en-IN" };

  it("renders the same number 100x apart, so a swap is never cosmetic", () => {
    // 832500 is 8,325 rupees in the GL and eight lakh rupees on a rate card.
    expect(formatMinor(832_500, "INR")).toContain("8,325.00");
    expect(formatMajor(832_500, INR)).toContain("8,32,500");
  });

  it("agrees only where a currency has no minor unit", () => {
    // JPY has scale 0, so the two coincide — the one case a swap hides.
    expect(formatMinor(1000, "JPY")).toContain("1,000");
    expect(formatMajor(1000, { currency: "JPY", locale: "ja-JP" })).toContain("1,000");
  });
});

describe("no minor-unit value reaches the major-unit formatter", () => {
  const calls = moneyCalls();

  /*
   * ANTI-VACUITY, and it is the point of the whole file. A census that matches
   * nothing reports zero violations and looks identical to a clean codebase.
   * These two cases fail if the walker, the import detection or the argument
   * extractor breaks, so the "0 violations" below is worth something.
   */
  it("actually reached the call sites it claims to check", () => {
    expect(calls.length).toBeGreaterThanOrEqual(15);
    expect(calls.filter((c) => c.major).length).toBeGreaterThanOrEqual(4);
    expect(calls.filter((c) => !c.major).length).toBeGreaterThanOrEqual(4);
  });

  it("can see a cross-unit expression when one is there", () => {
    // The two known-correct conversions. If the extractor stops seeing these,
    // it has also stopped being able to see an UNCONVERTED one.
    const crossing = calls.filter((c) => c.major && MINOR_VALUE.test(c.arg));
    expect(crossing.length).toBeGreaterThanOrEqual(2);
    expect(crossing.every((c) => CONVERTS_DOWN.test(c.arg))).toBe(true);
  });

  it("finds no unconverted minor value passed as major", () => {
    const bad = calls
      .filter((c) => c.major && MINOR_VALUE.test(c.arg) && !CONVERTS_DOWN.test(c.arg))
      .map((c) => `${c.file}:${c.line} formatMoney(${c.arg.trim()})`);
    expect(bad).toEqual([]);
  });

  it("never lets one file import both definitions", () => {
    // Two same-named functions in one scope is how the 100x mistake gets made
    // without anything looking wrong at the call site.
    const both = sourceFiles().filter((f) => {
      const src = codeOnly(readFileSync(f, "utf8"));
      if (!/\bformat(?:Minor)?Money\b/.test(src)) return false;
      return (
        /import[^;]*\bformatMoney\b[^;]*from "@\/lib\/format-utils"/.test(src) &&
        /import[^;]*\bformatMinorMoney\b[^;]*from "@\/lib\/accounting\/money"/.test(src)
      );
    });
    expect(both.map((f) => relative(REPO, f))).toEqual([]);
  });
});
