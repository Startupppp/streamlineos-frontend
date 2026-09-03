#!/usr/bin/env node
/**
 * `features/*` must be a DAG.
 *
 * `check:cycles` runs madge over FILES, and madge is right: no single file is in
 * a loop, so it reports zero and always has. PRD-C024's own dimension is
 * "frontend features", and at that granularity two loops stood at head:
 *
 *   features/chat/{chat-bubble, chat-entity-pills, internal-link-preview,
 *     ticket-mention-picker}  ->  @/features/build/shared/{status-badge,
 *     format-ticket-key}
 *   features/build/project-detail/project-chat-page.tsx  ->  @/features/chat/*
 *
 *   features/candidates/candidate-sheets.tsx  ->  @/features/hr/hr-sheet
 *   features/hr/recruitment/candidate-detail/*  ->  @/features/candidates/*
 *
 * Both were cut by promoting the shared leaf to `components/shared` — the rule
 * frontend/CLAUDE.md section 3 already states for a component with a second
 * consumer. This gate is what stops them coming back, because the gate that was
 * supposed to certify "zero cycles" measured a granularity at which they were
 * invisible.
 *
 * A cycle between two features means neither can be moved, deleted or reviewed
 * on its own: deleting `features/build/shared/status-badge.ts` broke four chat
 * components no build maintainer would have opened.
 *
 * Flags:
 *   --self-test   Plant a synthetic cycle and assert the detector sees it, then
 *                 remove it and assert the detector goes quiet. Exits non-zero
 *                 if either half misbehaves. Reads no repository state.
 *   --list        Print every cross-feature edge with its import count.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const FEATURES_DIR = join(ROOT, "features");
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);

/**
 * A scan that suddenly finds nothing is far likelier to be broken than the tree
 * clean — the exact failure this release keeps finding in other gates.
 */
const SCAN_FLOOR_FEATURES = 10;
const SCAN_FLOOR_EDGES = 20;

const IMPORT_PATTERN =
  /(?:import|export)\s[^;]*?from\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|require\(\s*["']([^"']+)["']\s*\)|jest\.mock\(\s*["']([^"']+)["']/g;

function listSourceFiles(dir) {
  const out = [];
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
        walk(full);
        continue;
      }
      const dot = entry.name.lastIndexOf(".");
      if (dot > 0 && SOURCE_EXTENSIONS.has(entry.name.slice(dot))) out.push(full);
    }
  };
  walk(dir);
  return out;
}

/** The top-level feature a repo-relative path belongs to, or null. */
function featureOf(repoRelativePath) {
  const parts = repoRelativePath.split(sep);
  if (parts[0] !== "features" || parts.length < 2) return null;
  return parts[1];
}

/**
 * Resolves an import specifier to a repo-relative path. Handles the `@/` alias
 * and relative specifiers; anything else (a package) resolves to null.
 */
function resolveSpecifier(fromFile, specifier) {
  if (specifier.startsWith("@/")) return specifier.slice(2).split("/").join(sep);
  if (specifier.startsWith(".")) {
    const absolute = resolve(dirname(fromFile), specifier);
    const rel = relative(ROOT, absolute);
    return rel.startsWith("..") ? null : rel;
  }
  return null;
}

export function buildFeatureGraph(files, readFile) {
  /** @type {Map<string, Map<string, string[]>>} */
  const edges = new Map();

  for (const file of files) {
    const owner = featureOf(relative(ROOT, file));
    if (owner === null) continue;

    const source = readFile(file);
    for (const match of source.matchAll(IMPORT_PATTERN)) {
      const specifier = match[1] ?? match[2] ?? match[3] ?? match[4];
      if (specifier === undefined) continue;
      const target = resolveSpecifier(file, specifier);
      if (target === null) continue;
      const targetFeature = featureOf(target);
      if (targetFeature === null || targetFeature === owner) continue;

      if (!edges.has(owner)) edges.set(owner, new Map());
      const perTarget = edges.get(owner);
      if (!perTarget.has(targetFeature)) perTarget.set(targetFeature, []);
      perTarget.get(targetFeature).push(`${relative(ROOT, file)} -> ${specifier}`);
    }
  }

  return edges;
}

/** Every simple cycle, each reported once from its lexicographically first node. */
export function findCycles(edges) {
  const cycles = [];
  const stack = [];
  const onStack = new Set();
  const seen = new Set();

  const visit = (node) => {
    stack.push(node);
    onStack.add(node);

    for (const next of edges.get(node)?.keys() ?? []) {
      if (onStack.has(next)) {
        const start = stack.indexOf(next);
        const cycle = stack.slice(start);
        // Normalise the rotation so one loop is reported once.
        const pivot = cycle.indexOf([...cycle].sort()[0]);
        const normalised = [...cycle.slice(pivot), ...cycle.slice(0, pivot)];
        const key = normalised.join(" -> ");
        if (!seen.has(key)) {
          seen.add(key);
          cycles.push(normalised);
        }
        continue;
      }
      if (stack.includes(next)) continue;
      visit(next);
    }

    stack.pop();
    onStack.delete(node);
  };

  for (const node of [...edges.keys()].sort()) visit(node);
  return cycles;
}

function selfTest() {
  const files = ["/r/features/a/one.ts", "/r/features/b/two.ts"];
  const planted = {
    "/r/features/a/one.ts": 'import { x } from "@/features/b/two";',
    "/r/features/b/two.ts": 'import { y } from "@/features/a/one";',
  };
  const clean = {
    "/r/features/a/one.ts": 'import { x } from "@/features/b/two";',
    "/r/features/b/two.ts": 'import { y } from "@/components/shared/two";',
  };

  // featureOf/resolveSpecifier are ROOT-relative, so the fixture is driven
  // through the same functions with a ROOT-relative shim.
  const shim = (map) => (file) => map[file];
  const rel = (file) => file.replace("/r/", "");
  const fixtureFiles = files.map((f) => join(ROOT, rel(f)));
  const remap = (map) =>
    Object.fromEntries(Object.entries(map).map(([k, v]) => [join(ROOT, rel(k)), v]));

  const withCycle = findCycles(buildFeatureGraph(fixtureFiles, shim(remap(planted))));
  const withoutCycle = findCycles(buildFeatureGraph(fixtureFiles, shim(remap(clean))));

  const failures = [];
  if (withCycle.length !== 1)
    failures.push(`planted cycle not detected (found ${withCycle.length})`);
  else if (withCycle[0].join(",") !== "a,b")
    failures.push(`planted cycle misreported as ${withCycle[0].join(",")}`);
  if (withoutCycle.length !== 0)
    failures.push(`clean fixture reported ${withoutCycle.length} cycle(s)`);

  if (failures.length > 0) {
    console.error("SELF-TEST FAILED:");
    for (const f of failures) console.error(`  ${f}`);
    process.exit(1);
  }
  console.log("check-feature-cycles self-test: detector sees a planted cycle and only that.");
  process.exit(0);
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--self-test")) return selfTest();

  let stat;
  try {
    stat = statSync(FEATURES_DIR);
  } catch {
    console.error(`FAIL: ${FEATURES_DIR} does not exist — this gate is not measuring anything.`);
    process.exit(1);
  }
  if (!stat.isDirectory()) {
    console.error(`FAIL: ${FEATURES_DIR} is not a directory.`);
    process.exit(1);
  }

  const files = listSourceFiles(FEATURES_DIR);
  const edges = buildFeatureGraph(files, (f) => readFileSync(f, "utf8"));
  const features = new Set(
    files.map((f) => featureOf(relative(ROOT, f))).filter((f) => f !== null),
  );

  const edgeCount = [...edges.values()].reduce((total, m) => total + m.size, 0);

  if (args.includes("--list")) {
    for (const [from, targets] of [...edges.entries()].sort()) {
      for (const [to, sites] of [...targets.entries()].sort()) {
        console.log(`${from} -> ${to}  (${sites.length})`);
      }
    }
    console.log(
      `\n${features.size} feature(s), ${edgeCount} cross-feature edge(s) over ${files.length} file(s)`,
    );
    process.exit(0);
  }

  if (features.size < SCAN_FLOOR_FEATURES || edgeCount < SCAN_FLOOR_EDGES) {
    console.error(
      `FAIL: scan floor — found ${features.size} feature(s) and ${edgeCount} cross-feature edge(s) ` +
        `(floor ${SCAN_FLOOR_FEATURES}/${SCAN_FLOOR_EDGES}). A gate that suddenly sees nothing is broken, not green.`,
    );
    process.exit(1);
  }

  const cycles = findCycles(edges);

  if (cycles.length > 0) {
    console.error(
      `FAIL: ${cycles.length} dependency cycle(s) between top-level features. ` +
        `madge reports zero because it measures files; PRD-C024 measures features.\n`,
    );
    for (const cycle of cycles) {
      console.error(`  ${[...cycle, cycle[0]].join(" -> ")}`);
      for (let i = 0; i < cycle.length; i += 1) {
        const from = cycle[i];
        const to = cycle[(i + 1) % cycle.length];
        for (const site of edges.get(from)?.get(to) ?? []) console.error(`      ${site}`);
      }
      console.error("");
    }
    console.error(
      "Promote the leaf both features share to components/shared (frontend/CLAUDE.md section 3),\n" +
        "rather than adding a re-export, which keeps the edge and hides it.",
    );
    process.exit(1);
  }

  console.log(
    `PASS: features/ is acyclic — ${features.size} feature(s), ${edgeCount} cross-feature edge(s), ${files.length} file(s) scanned.`,
  );
}

main();
