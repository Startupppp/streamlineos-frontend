import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const HOOK_ROOTS = ["hooks/api"];
const PAGE_ROOTS = ["features"];
const PAGE_FILE = /-page\.tsx$|-page-client\.tsx$|-view\.tsx$/;

const DENIAL_RENDERERS = [
  "NoPermissionState",
  "AccessDenied",
  "resolveGate",
  "renderPageState",
  "PageStateViews",
];

const BASELINE_PATH = path.join(ROOT, "scripts", "denied-state-baseline.json");

function walk(dir, out = []) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return out;
  const stack = [abs];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (/\.tsx?$/.test(entry.name)) out.push(full);
    }
  }
  return out;
}

function rel(file) {
  return path.relative(ROOT, file).split(path.sep).join("/");
}

export function selfGatingHooks(sources) {
  const gated = new Set();
  for (const { name, text } of sources) {
    if (!/\.ts$/.test(name) || /\.test\./.test(name)) continue;
    const parts = text.split(/export function (use[A-Z][A-Za-z0-9]*)/);
    for (let i = 1; i < parts.length; i += 2) {
      const body = parts[i + 1] ?? "";
      if (/enabled:[^,\n}]*\bcan[A-Z]/.test(body) || /enabled:[^,\n}]*useCan\(/.test(body))
        gated.add(parts[i]);
    }
  }
  return gated;
}

export function pageViolates(text, gated) {
  if (!/isLoading|isPending/.test(text)) return null;
  if (DENIAL_RENDERERS.some((marker) => text.includes(marker))) return null;
  const used = [...gated].filter((hook) => new RegExp("\\b" + hook + "\\s*\\(").test(text));
  return used.length > 0 ? used : null;
}

function scan() {
  const hookSources = HOOK_ROOTS.flatMap((root) =>
    walk(root).map((file) => ({ name: file, text: fs.readFileSync(file, "utf8") })),
  );
  const gated = selfGatingHooks(hookSources);

  const violations = new Map();
  for (const root of PAGE_ROOTS)
    for (const file of walk(root)) {
      if (!PAGE_FILE.test(file)) continue;
      const used = pageViolates(fs.readFileSync(file, "utf8"), gated);
      if (used) violations.set(rel(file), used);
    }
  return { gated, violations };
}

function readBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) return new Set();
  return new Set(JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8")).files);
}

function runSelfTest() {
  const failures = [];
  const gated = selfGatingHooks([
    {
      name: "hooks/api/x.ts",
      text: "export function useThing() {\n  return useQuery({ enabled: canView });\n}\n",
    },
    {
      name: "hooks/api/y.ts",
      text: "export function useOpen() {\n  return useQuery({ enabled: true });\n}\n",
    },
  ]);

  if (!gated.has("useThing")) failures.push("self-test MISSED a hook gated by `enabled: canView`");
  else console.log("✔ self-test detected a self-gating hook");

  if (gated.has("useOpen")) failures.push("self-test WRONGLY flagged an ungated hook");
  else console.log("✔ self-test exempted an ungated hook");

  const bad = "const { data, isLoading } = useThing();\nif (isLoading) return <Skeleton />;\n";
  if (!pageViolates(bad, gated)) failures.push("self-test MISSED a page with no denied branch");
  else console.log("✔ self-test detected a page with no denied branch");

  const good = bad + "if (gate === 'denied') return <NoPermissionState />;\n";
  if (pageViolates(good, gated)) failures.push("self-test WRONGLY flagged a page rendering NoPermissionState");
  else console.log("✔ self-test exempted a page rendering NoPermissionState");

  const noQuery = "export function Thing() { return <div />; }\n";
  if (pageViolates(noQuery, gated)) failures.push("self-test WRONGLY flagged a page with no query state");
  else console.log("✔ self-test exempted a page with no query state");

  if (failures.length) {
    for (const failure of failures) console.error("✘ " + failure);
    process.exit(1);
  }
  console.log("\nself-test passed");
}

function main() {
  if (process.argv.includes("--self-test")) return runSelfTest();

  const { gated, violations } = scan();

  if (gated.size < 50) {
    console.error(
      `REFUSING TO PASS: resolved only ${gated.size} self-gating hooks. ` +
        "The hook scan is broken, so an empty result would be vacuous.",
    );
    process.exit(1);
  }

  if (process.argv.includes("--write-baseline")) {
    fs.writeFileSync(
      BASELINE_PATH,
      JSON.stringify({ files: [...violations.keys()].sort() }, null, 2) + "\n",
    );
    console.log(`wrote ${violations.size} entries to ${rel(BASELINE_PATH)}`);
    return;
  }

  const baseline = readBaseline();
  const added = [...violations.keys()].filter((file) => !baseline.has(file)).sort();
  const fixed = [...baseline].filter((file) => !violations.has(file)).sort();

  console.log(`self-gating query hooks: ${gated.size}`);
  console.log(`pages with no denied branch: ${violations.size} (baseline ${baseline.size})`);

  if (fixed.length) {
    console.log("\nFixed since the baseline was written — remove these from the baseline:");
    for (const file of fixed) console.log("  " + file);
  }

  if (added.length) {
    console.error("\nNEW pages call a permission-gated hook but render no denied state.");
    console.error("A disabled query reports isLoading:false and isError:false with data:undefined,");
    console.error("so branching only on those shows a DENIED user the EMPTY state.");
    console.error("Gate with useCanState + resolveGate + NoPermissionState.\n");
    for (const file of added) console.error("  " + file + "  <- " + violations.get(file).join(", "));
    process.exit(1);
  }

  if (fixed.length) {
    console.error(
      "\nThe baseline is stale. Run `pnpm check:denied-state --write-baseline` so it can only shrink.",
    );
    process.exit(1);
  }

  console.log("\nNo new denied-state regressions.");
}

main();
