/**
 * @jest-environment node
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

/**
 * PRD-C026 names "query keys" in its own list of symbols that must not be left unused, and closes
 * with "An exported symbol is not considered used merely because a barrel exports it." The registry
 * in `lib/query-keys/` is one object literal reached through a single `queryKeys` export, so every
 * leaf factory inside it is exported by that one symbol whatever its reachability — knip sees the
 * export, never the 900-odd leaves behind it. Nothing in the repo could report a leaf nobody calls,
 * and 49 of them had accumulated.
 *
 * This spec is that report. It reads the WHOLE registry (every non-test file in lib/query-keys) and
 * scans the WHOLE frontend for a reference to each leaf, so it can see an instance in a file no one
 * has touched. It is deliberately conservative in the retaining direction: a leaf counts as
 * referenced if either its full `queryKeys.<path>` chain OR its bare `.<leaf>` property name appears
 * anywhere outside the registry, which keeps an aliased or destructured call site (`const k =
 * queryKeys.hr; k.leaves()`) from being reported dead.
 */

const FE_ROOT = join(__dirname, "..", "..");
const KEY_DIR = __dirname;

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  ".claude",
  ".scratch",
  "coverage",
  "public",
  "feedbucket-widget",
]);

/**
 * PRD-C023: "CRM/Inventory ... must be reported separately, not silently included or deleted."
 * These namespaces are out of the release's scope, so their unreachable leaves are enumerated
 * below rather than deleted — and the enumeration is asserted exactly, so one appearing or
 * disappearing is a conscious edit rather than a silent drift.
 */
const CRM_INVENTORY_NAMESPACES = new Set([
  "crm",
  "aiCrm",
  "crmProducts",
  "crmPricebooks",
  "crmMetadata",
  "leads",
  "deals",
  "contacts",
  "salesAnalytics",
  "inventory",
]);

const CRM_INVENTORY_UNREACHABLE = [
  "aiCrm.dealSummary",
  "aiCrm.duplicateSuggestions",
  "aiCrm.leadSummary",
  "crm.crmImport",
  "crm.customerExecutiveDashboard",
  "crm.reportingRunsAll",
  "crm.salesDashboard",
  "crm.salesFunnel",
  "deals.forecastCompare",
  "inventory.aiDigest",
  "salesAnalytics.cycleLength",
  "salesAnalytics.lostAnalysis",
  "salesAnalytics.repComparison",
];

interface Leaf {
  path: string;
  name: string;
  file: string;
  line: number;
}

function parseRegistryLeaves(keyDir: string, root: string): Leaf[] {
  const leaves: Leaf[] = [];
  for (const entry of readdirSync(keyDir)) {
    if (!entry.endsWith(".ts") || entry.endsWith(".test.ts")) continue;
    const full = join(keyDir, entry);
    const src = ts.createSourceFile(full, readFileSync(full, "utf8"), ts.ScriptTarget.ESNext, true);
    const visitObject = (obj: ts.ObjectLiteralExpression, prefix: string): void => {
      for (const prop of obj.properties) {
        if (!ts.isPropertyAssignment(prop)) continue;
        const name = prop.name.getText(src).replace(/['"]/g, "");
        const path = prefix ? `${prefix}.${name}` : name;
        const init = prop.initializer;
        if (ts.isObjectLiteralExpression(init)) {
          visitObject(init, path);
          continue;
        }
        if (!ts.isArrowFunction(init)) continue;
        const { line } = src.getLineAndCharacterOfPosition(prop.getStart(src));
        leaves.push({ path, name, file: relative(root, full), line: line + 1 });
      }
    };
    const visit = (node: ts.Node): void => {
      if (ts.isVariableDeclaration(node) && node.initializer) {
        let init: ts.Expression = node.initializer;
        if (ts.isAsExpression(init)) init = init.expression;
        if (ts.isObjectLiteralExpression(init)) visitObject(init, "");
      }
      ts.forEachChild(node, visit);
    };
    visit(src);
  }
  return leaves;
}

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name) || entry.name.startsWith(".next")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.(tsx?|mjs)$/.test(entry.name)) yield full;
  }
}

function unreachableLeaves(
  leaves: Leaf[],
  root: string,
  registryPrefix: string,
): { leaves: Leaf[]; filesScanned: number } {
  const referenced = new Set<string>();
  const leafRe = new Map(leaves.map((l) => [l.path, new RegExp(`\\.${l.name}\\b`)]));
  let filesScanned = 0;
  for (const file of walk(root)) {
    const rel = relative(root, file).split("\\").join("/");
    if (rel.startsWith(registryPrefix)) continue;
    const text = readFileSync(file, "utf8");
    filesScanned++;
    for (const leaf of leaves) {
      if (referenced.has(leaf.path)) continue;
      if (text.includes(`queryKeys.${leaf.path}`)) {
        referenced.add(leaf.path);
        continue;
      }
      const re = leafRe.get(leaf.path);
      if (re && re.test(text)) referenced.add(leaf.path);
    }
  }
  return { leaves: leaves.filter((l) => !referenced.has(l.path)), filesScanned };
}

const registry = parseRegistryLeaves(KEY_DIR, FE_ROOT);
const scan = unreachableLeaves(registry, FE_ROOT, "lib/query-keys/");
const namespaceOf = (path: string): string => path.split(".")[0] ?? "";

describe("the query-key registry is scanned in full, not sampled", () => {
  it("parses the whole registry", () => {
    expect(registry.length).toBeGreaterThan(800);
  });

  it("scans the whole frontend outside the registry", () => {
    expect(scan.filesScanned).toBeGreaterThan(3000);
  });

  it("resolves the leaves the registry is known to carry", () => {
    const paths = new Set(registry.map((l) => l.path));
    expect(paths.has("hr.leaves")).toBe(true);
    expect(paths.has("hr.employees")).toBe(true);
  });
});

describe("no in-scope query-key factory is unreachable", () => {
  it("every leaf outside CRM/Inventory has a caller", () => {
    const dead = scan.leaves
      .filter((l) => !CRM_INVENTORY_NAMESPACES.has(namespaceOf(l.path)))
      .map((l) => `queryKeys.${l.path} — ${l.file}:${l.line}`)
      .sort();
    expect(dead.join("\n")).toBe("");
  });
});

describe("CRM/Inventory unreachable leaves are reported, not deleted and not hidden", () => {
  it("matches the enumerated out-of-scope set exactly", () => {
    const crm = scan.leaves
      .filter((l) => CRM_INVENTORY_NAMESPACES.has(namespaceOf(l.path)))
      .map((l) => l.path)
      .sort();
    expect(crm).toEqual([...CRM_INVENTORY_UNREACHABLE].sort());
  });

  it("the carve-out only names CRM/Inventory namespaces that the registry actually has", () => {
    const present = new Set(registry.map((l) => namespaceOf(l.path)));
    const stale = [...CRM_INVENTORY_NAMESPACES].filter((ns) => !present.has(ns));
    expect(stale).toEqual([]);
  });
});
