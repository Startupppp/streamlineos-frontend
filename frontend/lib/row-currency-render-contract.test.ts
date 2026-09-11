import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");

const SOURCE_DIRECTORIES = [
  "app",
  "components",
  "features",
  "hooks",
  "lib",
] as const;

const SOURCE_EXTENSIONS = [".ts", ".tsx"] as const;

/**
 * The corpus is discovered, not enumerated: a fourth site added anywhere under
 * the source roots is scanned by the same walk that found the first three.
 */
function sourceFiles(): string[] {
  const found: string[] = [];
  for (const directory of SOURCE_DIRECTORIES)
    for (const entry of readdirSync(path.join(ROOT, directory), {
      recursive: true,
    })) {
      const relative = path.join(directory, String(entry)).split(path.sep).join("/");
      if (!SOURCE_EXTENSIONS.some((extension) => relative.endsWith(extension)))
        continue;
      if (relative.includes(".test.") || relative.includes("__tests__"))
        continue;
      found.push(relative);
    }
  return found;
}

const INR_ONLY_ON_A_ROW_AMOUNT =
  /\bformatINR(?:Compact)?\(\s*[A-Za-z_$][\w$]*(?:\?)?\.amount\b/g;

describe("a row that stores its own currency is never rendered as rupees", () => {
  const files = sourceFiles();

  it("scans a non-trivial corpus, so an empty result means clean and not unscanned", () => {
    expect(files.length).toBeGreaterThan(500);
    expect(
      files.filter((file) => readFileSync(path.join(ROOT, file), "utf8").includes("formatINR"))
        .length,
    ).toBeGreaterThan(5);
  });

  it("has no site passing a row's `.amount` to the INR-hardcoded formatters", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const source = readFileSync(path.join(ROOT, file), "utf8");
      for (const match of source.matchAll(INR_ONLY_ON_A_ROW_AMOUNT)) {
        const line = source.slice(0, match.index).split("\n").length;
        offenders.push(`${file}:${String(line)} — ${match[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("keeps the three known expense-row sites on the currency-aware formatter", () => {
    const rowSites = [
      "features/hr/expenses/expense-list.tsx",
      "features/hr/expenses/expense-item.tsx",
      "features/hr/expenses/expenses-widget.tsx",
    ];
    for (const file of rowSites) {
      const source = readFileSync(path.join(ROOT, file), "utf8");
      expect(source).toContain("formatAmountInCurrency(expense.amount, expense.currency)");
    }
  });
});
