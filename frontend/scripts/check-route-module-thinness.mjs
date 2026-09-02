#!/usr/bin/env node
/**
 * check-route-module-thinness — an authenticated route module is metadata,
 * parameters, server authorization and composition. State, data fetching, forms
 * and direct transport belong behind a feature-owned interface.
 *
 * The gate is a ratchet: the current count is the ceiling and may only fall.
 * CRM and Inventory are outside the release, so their routes are partitioned and
 * PRINTED rather than filtered away — a silently dropped path reads as covered
 * when it is not.
 *
 *   node scripts/check-route-module-thinness.mjs
 *   node scripts/check-route-module-thinness.mjs --list
 *   node scripts/check-route-module-thinness.mjs --self-test
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ROUTE_ROOT = join(ROOT, "app", "(authenticated)");

// Lower this after moving orchestration behind a feature interface. Never raise it.
const BASELINE = { inScopeThick: 114 };
const MAX_ROUTE_LINES = 300;
const SCAN_FLOOR = { minRouteFiles: 200 };

const OUT_OF_SCOPE_SEGMENTS = ["crm", "inventory"];

const SIGNALS = [
  { key: "state", re: /\buse(?:State|Reducer)\s*[<(]/, why: "component state" },
  { key: "query", re: /\buse(?:Query|InfiniteQuery|Queries|Mutation|AuthorizedMutation)\s*[<(]/, why: "data fetching" },
  { key: "form", re: /\buseForm\s*[<(]/, why: "form orchestration" },
  { key: "transport", re: /\bapiClient\s*\./, why: "direct apiClient call" },
];

function walk(dir, out) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry === "page.tsx" || entry === "layout.tsx") out.push(full);
  }
  return out;
}

function firstSegment(rel) {
  const parts = rel.split("/");
  const idx = parts.indexOf("(authenticated)");
  return idx === -1 ? "" : (parts[idx + 1] ?? "");
}

export function inspectRouteModule(source, relPath) {
  const lines = source.split("\n").length;
  const reasons = [];
  for (const signal of SIGNALS) if (signal.re.test(source)) reasons.push(signal.why);
  if (lines > MAX_ROUTE_LINES) reasons.push(`${lines} lines (limit ${MAX_ROUTE_LINES})`);
  return { relPath, lines, reasons, thick: reasons.length > 0 };
}

function assert(cond, msg) {
  if (!cond) { console.error(`FAIL: ${msg}`); process.exit(1); }
}

function runSelfTest() {
  console.log("Running self-test for check-route-module-thinness...\n");

  const cases = [
    {
      label: "(a) a thin route module composing a feature component",
      src: `import { WorkersPage } from "@/features/directory/workers/workers-page";
export const metadata = { title: "Workers" };
export default async function Page() {
  await requirePermission("directory:workers:view");
  return <WorkersPage />;
}`,
      thick: false,
    },
    {
      label: "(b) a route module holding component state",
      src: `"use client";
export default function Page() {
  const [open, setOpen] = useState(false);
  return <div>{open}</div>;
}`,
      thick: true,
    },
    {
      label: "(c) a route module fetching its own data",
      src: `"use client";
export default function Page() {
  const { data } = useQuery({ queryKey: queryKeys.hr.all, queryFn: load });
  return <div>{data}</div>;
}`,
      thick: true,
    },
    {
      label: "(d) a route module issuing a mutation with the generic form",
      src: `"use client";
export default function Page() {
  const m = useMutation<Row, Error, Input>({ mutationFn: save });
  return <div>{m.status}</div>;
}`,
      thick: true,
    },
    {
      label: "(e) a route module calling apiClient directly",
      src: `"use client";
export default function Page() {
  async function run() { await apiClient.post("/build/projects", {}); }
  return <button onClick={run}>go</button>;
}`,
      thick: true,
    },
    {
      label: "(f) a route module owning a form",
      src: `"use client";
export default function Page() {
  const form = useForm<Values>({ resolver: zodResolver(schema) });
  return <form />;
}`,
      thick: true,
    },
    {
      label: "(g) a thin but oversized route module",
      src: `export default function Page() {\n${"  // composition\n".repeat(320)}  return null;\n}`,
      thick: true,
    },
    {
      label: "(h) a name that merely contains a signal word is not a match",
      src: `import { useStateOfTheArtBanner } from "@/features/marketing/banner";
export default function Page() {
  return <useStateOfTheArtBanner />;
}`,
      thick: false,
    },
  ];

  for (const c of cases) {
    const result = inspectRouteModule(c.src, "app/(authenticated)/x/page.tsx");
    assert(
      result.thick === c.thick,
      `${c.label}: expected thick=${c.thick}, got ${result.thick} (${result.reasons.join(", ")})`,
    );
    console.log(`  ${c.label} → ${result.thick ? `thick: ${result.reasons.join(", ")}` : "thin"}`);
  }

  const scoped = firstSegment("app/(authenticated)/crm/deals/page.tsx");
  assert(scoped === "crm", `(i) segment extraction returned "${scoped}", expected "crm"`);
  console.log("  (i) out-of-scope segment is identified, not filtered by substring");

  console.log(`\n✔ ${cases.length + 1} thinness fixtures passed — check-route-module-thinness is live.\n`);
}

function runMainScan() {
  const files = walk(ROUTE_ROOT, []);
  if (files.length < SCAN_FLOOR.minRouteFiles) {
    console.error(
      `FAIL: scan floor not met — found only ${files.length} authenticated route modules ` +
        `(expected ≥${SCAN_FLOOR.minRouteFiles}). The scanner is broken or the wrong tree was scanned.`,
    );
    process.exit(1);
  }

  const inScope = [];
  const outOfScope = [];
  for (const file of files) {
    const rel = relative(ROOT, file).replace(/\\/g, "/");
    const result = inspectRouteModule(readFileSync(file, "utf8"), rel);
    if (!result.thick) continue;
    (OUT_OF_SCOPE_SEGMENTS.includes(firstSegment(rel)) ? outOfScope : inScope).push(result);
  }

  inScope.sort((a, b) => b.lines - a.lines);
  outOfScope.sort((a, b) => b.lines - a.lines);

  console.log(`check-route-module-thinness: ${files.length} authenticated route modules scanned`);
  console.log(`  IN SCOPE thick:      ${inScope.length} (baseline ${BASELINE.inScopeThick})`);
  console.log(`  OUT OF SCOPE thick:  ${outOfScope.length} (CRM/Inventory, outside the release)`);

  if (process.argv.includes("--list")) {
    console.log("\n--- IN SCOPE ---");
    for (const r of inScope) console.log(`  ${r.lines.toString().padStart(4)}  ${r.relPath} — ${r.reasons.join(", ")}`);
    console.log("\n--- OUT OF SCOPE (CRM/Inventory) ---");
    for (const r of outOfScope) console.log(`  ${r.lines.toString().padStart(4)}  ${r.relPath} — ${r.reasons.join(", ")}`);
  }

  if (inScope.length > BASELINE.inScopeThick) {
    console.error(
      `\nFAIL: ${inScope.length - BASELINE.inScopeThick} route module(s) above the baseline of ${BASELINE.inScopeThick}. ` +
        `Move state, queries, forms and transport behind a feature-owned interface; run with --list to see them.`,
    );
    process.exit(1);
  }

  if (inScope.length < BASELINE.inScopeThick)
    console.log(
      `\nNOTE: ${BASELINE.inScopeThick - inScope.length} below baseline — lower BASELINE.inScopeThick to ${inScope.length} to hold the gain.`,
    );

  console.log("\nPASS: authenticated route-module thinness is within its ratchet.");
}

if (process.argv.includes("--self-test")) runSelfTest();
else runMainScan();
