#!/usr/bin/env node
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveBackendRoot } from "./lib/backend-root.mjs";
import {
  fieldLine,
  followLazyExport,
  resolveModuleFile,
  scanTree,
} from "./contract-parity/frontend-contracts.mjs";
import { loadContractSchemas } from "./contract-parity/load-contracts.mjs";
import {
  diffSchemas,
  indexOperations,
  responseBodySchema,
  routePattern,
  unwrapSuccessEnvelope,
} from "./contract-parity/schema-diff.mjs";
import { runSelfTest } from "./contract-parity/self-test.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// Deliberately NOT under node_modules: in these git worktrees, frontend/node_modules is a
// symlink into a sibling worktree's node_modules. esbuild resolves entryPoints through
// symlinks (realpath) before resolving relative imports, so an entry file whose path runs
// through that symlink has its relative imports (`../../hooks/...`) resolved against the
// WRONG worktree's source tree. Keeping the cache dir outside node_modules keeps the entry
// file's real path inside THIS worktree regardless of the node_modules symlink situation.
const CACHE_DIR = join(ROOT, ".cache", "contract-parity");
const SCAN_DIRS = ["hooks", "lib", "app", "features", "components"];
const BACKEND_DOCUMENT = "openapi.json";

const FLOORS = { calls: 2400, contracts: 900, matchedRoutes: 400 };
const BASELINE_FILE = join(ROOT, "scripts", "contract-parity-baseline.json");

const USAGE = [
  "check-contract-parity — does a frontend response contract REQUIRE a field the deployed backend does not send?",
  "",
  "  node scripts/check-contract-parity.mjs                          compare against origin/main of the backend repo",
  "  node scripts/check-contract-parity.mjs --backend-rev <rev>      compare against any git revision (tag, sha, branch)",
  "  node scripts/check-contract-parity.mjs --backend-rev worktree   compare against the backend working tree artifact",
  "  node scripts/check-contract-parity.mjs --backend-file <path>    compare against an openapi.json on disk",
  "  node scripts/check-contract-parity.mjs --list                   print every finding, including the frozen debt and the advisory ones",
  "  node scripts/check-contract-parity.mjs --update-baseline        freeze today's drift so the NEXT new one fails",
  "  node scripts/check-contract-parity.mjs --json                   machine-readable output",
  "  node scripts/check-contract-parity.mjs --self-test              prove the gate bites on the shipped outage",
].join("\n");

function parseArgs(argv) {
  const options = {
    backendRev: "origin/main",
    backendFile: null,
    list: argv.includes("--list"),
    json: argv.includes("--json"),
    selfTest: argv.includes("--self-test"),
    updateBaseline: argv.includes("--update-baseline"),
    help: argv.includes("--help"),
  };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--backend-rev" && argv[index + 1] !== undefined) options.backendRev = argv[index + 1];
    if (argv[index] === "--backend-file" && argv[index + 1] !== undefined) options.backendFile = argv[index + 1];
  }
  return options;
}

function readBackendDocument(options) {
  if (options.backendFile !== null) {
    if (!existsSync(options.backendFile)) return { error: `no such file: ${options.backendFile}` };
    return { text: readFileSync(options.backendFile, "utf8"), origin: options.backendFile, revision: "(file)" };
  }
  const backendRoot = resolveBackendRoot(ROOT);
  if (backendRoot === null)
    return {
      error: [
        "the backend repository is not on disk beside this one, so no deployed revision can be read — this gate must not report a pass.",
        "      Where only the frontend is checked out (CI), run it against the vendored copy instead:",
        "        node scripts/check-contract-parity.mjs --backend-file contracts/openapi.json",
        "      That compares this tree against the document THIS repo vendored, which is a local-vs-local check:",
        "      it catches a contract the backend repo never declared, and it cannot catch a backend commit that was never pushed.",
      ].join("\n"),
    };
  if (options.backendRev === "worktree") {
    const path = join(backendRoot, BACKEND_DOCUMENT);
    if (!existsSync(path)) return { error: `no ${BACKEND_DOCUMENT} in ${backendRoot}` };
    return { text: readFileSync(path, "utf8"), origin: `${backendRoot} (working tree)`, revision: "worktree" };
  }
  const described = spawnSync("git", ["-C", backendRoot, "rev-parse", "--short", options.backendRev], {
    encoding: "utf8",
  });
  if (described.status !== 0)
    return { error: `backend revision '${options.backendRev}' does not resolve: ${(described.stderr ?? "").trim()}` };
  const shown = spawnSync("git", ["-C", backendRoot, "show", `${options.backendRev}:${BACKEND_DOCUMENT}`], {
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,
  });
  if (shown.status !== 0)
    return { error: `cannot read ${BACKEND_DOCUMENT} at '${options.backendRev}': ${(shown.stderr ?? "").trim()}` };
  return {
    text: shown.stdout,
    origin: `${backendRoot}@${options.backendRev}`,
    revision: `${options.backendRev} (${described.stdout.trim()})`,
  };
}

function contractRefs(calls) {
  const refs = new Map();
  const unresolved = [];
  for (const call of calls) {
    if (call.ref === null) {
      if (call.reason !== "no contract argument") unresolved.push(call);
      continue;
    }
    const declared =
      call.ref.ownFile === true ? call.absolute : resolveModuleFile(call.ref.specifier, call.absolute, ROOT);
    if (declared === null) {
      unresolved.push({ ...call, reason: `contract module '${call.ref.specifier}' does not resolve to a file` });
      continue;
    }
    const { file, exportName } = followLazyExport(declared, call.ref.exportName, ROOT);
    const key = `${file}#${exportName}`;
    if (!refs.has(key)) refs.set(key, { key, file, exportName });
    call.contractKey = key;
    call.contractFile = file;
    call.contractName = exportName;
  }
  return { refs: [...refs.values()], unresolved };
}

export function evaluate(records, document) {
  const operations = indexOperations(document);
  const findings = { missing: [], extras: [], optionalOnBackend: [], unmatchedRoutes: [], noResponseSchema: [] };
  const matched = new Set();
  for (const record of records) {
    const pattern = routePattern(record.route);
    const entry = operations.get(`${record.method} ${pattern}`);
    if (entry === undefined) {
      findings.unmatchedRoutes.push({ ...record, pattern });
      continue;
    }
    matched.add(`${record.method} ${pattern}`);
    const body = responseBodySchema(entry.operation);
    if (body === null) {
      findings.noResponseSchema.push({ ...record, backendPath: entry.path });
      continue;
    }
    const payload = unwrapSuccessEnvelope(body, document);
    const diff = diffSchemas(record.schema, payload, record.schema, document);
    for (const item of diff.missing)
      findings.missing.push({ ...record, backendPath: entry.path, fieldPath: item.path, field: item.field });
    for (const item of diff.extras)
      findings.extras.push({ ...record, backendPath: entry.path, fieldPath: item.path, field: item.field });
    for (const item of diff.optionalOnBackend)
      findings.optionalOnBackend.push({ ...record, backendPath: entry.path, fieldPath: item.path, field: item.field });
  }
  return { ...findings, matchedRoutes: matched.size, operations: operations.size };
}

export function findingKey(finding) {
  return `${finding.method} ${finding.backendPath} ${finding.fieldPath}`;
}

export function partitionFindings(findings, baselineKeys) {
  const known = new Set(baselineKeys);
  const fresh = [];
  const frozen = [];
  for (const finding of findings) (known.has(findingKey(finding)) ? frozen : fresh).push(finding);
  const present = new Set(findings.map(findingKey));
  return { fresh, frozen, stale: baselineKeys.filter((key) => !present.has(key)) };
}

function readBaseline() {
  if (!existsSync(BASELINE_FILE)) return { missing: [], extras: [], capturedAgainst: "(no baseline file)" };
  const parsed = JSON.parse(readFileSync(BASELINE_FILE, "utf8"));
  return {
    missing: parsed.missing ?? [],
    extras: parsed.extras ?? [],
    capturedAgainst: parsed.capturedAgainst ?? "(unknown revision)",
  };
}

function writeBaseline(result, document) {
  writeFileSync(
    BASELINE_FILE,
    `${JSON.stringify(
      {
        capturedAgainst: document.revision,
        capturedAt: new Date().toISOString(),
        missing: result.missing.map(findingKey).sort(),
        extras: result.extras.map(findingKey).sort(),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

export function floorFailures(stats, matchedRoutes) {
  return [
    stats.calls < FLOORS.calls
      ? `scan floor: ${stats.calls} seam calls, below the ${FLOORS.calls} this tree holds — the scanner is broken, not the tree`
      : null,
    stats.contracts < FLOORS.contracts
      ? `contract floor: ${stats.contracts} contracts loaded, below ${FLOORS.contracts} — the loader is broken, not the tree`
      : null,
    matchedRoutes < FLOORS.matchedRoutes
      ? `route floor: ${matchedRoutes} routes matched, below ${FLOORS.matchedRoutes} — route matching is broken, not the tree`
      : null,
  ].filter((failure) => failure !== null);
}

function describe(finding) {
  const found = fieldLine(finding.contractFile, finding.field);
  const file = finding.contractFile.replace(ROOT, "").replaceAll("\\", "/").replace(/^\//, "");
  const where = found === null ? file : `${file}:${found.line}`;
  const ambiguity = found !== null && found.occurrences > 1 ? ` — first of ${found.occurrences} '${finding.field}:' lines in this file` : "";
  return [
    `  ${finding.method.toUpperCase()} ${finding.backendPath}`,
    `    field:    ${finding.fieldPath}`,
    `    frontend: ${where}  (${finding.contractName})${ambiguity}`,
    `    call:     ${finding.file}:${finding.line}`,
  ].join("\n");
}

function report(result, document, options, stats, baseline) {
  const missing = partitionFindings(result.missing, baseline.missing);
  const extras = partitionFindings(result.extras, baseline.extras);
  console.log("Contract parity — frontend response contracts vs the backend's published response schemas\n");
  console.log(`  Backend document:     ${document.revision}  ${document.origin}`);
  console.log(`  Operations declared:  ${result.operations}`);
  console.log(`  Seam calls scanned:   ${stats.calls}   (${SCAN_DIRS.join(" ")})`);
  console.log(`  Contracts loaded:     ${stats.contracts} distinct, covering ${stats.records} call sites`);
  console.log(`  Routes matched:       ${result.matchedRoutes}`);
  console.log(
    `  Not comparable:       ${result.unmatchedRoutes.length} route(s) absent from the document, ${result.noResponseSchema.length} without a response schema, ${stats.unresolved} unresolvable contract expression(s), ${stats.loadFailures} contract(s) that would not convert\n`,
  );

  console.log(
    `  Frozen debt:          ${missing.frozen.length} missing + ${extras.frozen.length} strict-extra finding(s) recorded in scripts/contract-parity-baseline.json against ${baseline.capturedAgainst}\n`,
  );

  if (missing.fresh.length > 0) {
    console.error(
      `FAIL: ${missing.fresh.length} NEW required field(s) the frontend demands and the backend at ${document.revision} does not declare.`,
    );
    console.error("      applyContract throws ApiContractError on every one of these — the screen dies, it does not degrade.\n");
    for (const finding of missing.fresh) console.error(describe(finding));
    console.error("");
  }

  if (extras.fresh.length > 0) {
    console.error(
      `FAIL: ${extras.fresh.length} NEW field(s) the backend sends into a .strict() frontend contract — Zod throws on an unknown key.\n`,
    );
    for (const finding of extras.fresh) console.error(describe(finding));
    console.error("");
  }

  if (missing.stale.length > 0 || extras.stale.length > 0)
    console.log(
      `NOTE: ${missing.stale.length + extras.stale.length} baseline entry(entries) no longer reproduce against ${document.revision}. Rerun --update-baseline against the revision you gate on; this is expected when you point the gate at a different revision, and is not a failure.\n`,
    );

  if (options.list) {
    console.log(`Frozen debt — ${missing.frozen.length} missing field(s) already recorded:`);
    for (const finding of missing.frozen.slice(0, 80))
      console.log(`  ${finding.method.toUpperCase()} ${finding.backendPath}  ${finding.fieldPath}  (${finding.contractName})`);
    console.log("");
    console.log(`Advisory — ${result.optionalOnBackend.length} field(s) the frontend requires that the backend declares OPTIONAL:`);
    for (const finding of result.optionalOnBackend.slice(0, 40))
      console.log(`  ${finding.method.toUpperCase()} ${finding.backendPath}  ${finding.fieldPath}  (${finding.contractName})`);
    console.log(`Contracts that would not convert to a comparable shape (${stats.loadFailures}):`);
    for (const failure of stats.failures) console.log(`  ${failure.key.replace(ROOT, "").replaceAll("\\", "/")}  ${failure.reason}`);
    console.log(`\nUnmatched routes — no such operation in the document at ${document.revision}:`);
    for (const finding of result.unmatchedRoutes.slice(0, 60))
      console.log(`  ${finding.method.toUpperCase()} ${finding.pattern}  ${finding.file}:${finding.line}`);
    console.log("");
  }

  const floors = floorFailures(stats, result.matchedRoutes);
  for (const failure of floors) console.error(`FAIL: ${failure}`);

  if (missing.fresh.length === 0 && extras.fresh.length === 0 && floors.length === 0) {
    console.log(
      `PASS: no NEW frontend contract requires a field ${document.revision} does not declare (${missing.frozen.length} frozen, listed in the baseline).`,
    );
    console.log("BLIND SPOTS (this gate does not see them):");
    console.log(`  - the document is an artifact: it proves what the backend REPO declared at ${document.revision}, not what the running API emits`);
    console.log(`  - ${result.unmatchedRoutes.length} call site route(s) match no operation; ${stats.unresolved} contract expression(s) do not resolve to a module export`);
    console.log("  - types and nullability are not compared, only presence: a string-vs-number or null-vs-string drift still throws at runtime");
    console.log(`  - ${result.optionalOnBackend.length} field(s) are required here and optional there (run --list); the backend document is generated io:\"input\", so a .default() reads as optional`);
    return 0;
  }
  return 1;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(USAGE);
    return 0;
  }
  if (options.selfTest) return runSelfTest(evaluate, floorFailures, partitionFindings);

  const document = readBackendDocument(options);
  if (document.error !== undefined) {
    console.error(`FAIL: ${document.error}`);
    return 1;
  }

  const calls = scanTree(ROOT, SCAN_DIRS);
  const { refs, unresolved } = contractRefs(calls);
  rmSync(CACHE_DIR, { recursive: true, force: true });
  const { schemas, failures } = await loadContractSchemas(ROOT, CACHE_DIR, refs);
  rmSync(CACHE_DIR, { recursive: true, force: true });

  const records = calls
    .filter((call) => call.route !== null && call.contractKey !== undefined && schemas.has(call.contractKey))
    .map((call) => ({
      route: call.route,
      method: call.method,
      file: call.file,
      line: call.line,
      contractKey: call.contractKey,
      contractFile: call.contractFile,
      contractName: call.contractName,
      schema: schemas.get(call.contractKey),
    }));

  const result = evaluate(records, JSON.parse(document.text));

  if (options.updateBaseline) {
    writeBaseline(result, document);
    console.log(
      `Baseline written: ${result.missing.length} missing and ${result.extras.length} strict-extra finding(s) frozen against ${document.revision}.`,
    );
    return 0;
  }

  const baseline = readBaseline();

  if (options.json) {
    const missing = partitionFindings(result.missing, baseline.missing);
    const extras = partitionFindings(result.extras, baseline.extras);
    process.stdout.write(
      JSON.stringify({
        revision: document.revision,
        scanned: calls.length,
        contracts: schemas.size,
        records: records.length,
        frozen: { missing: missing.frozen.length, extras: extras.frozen.length, stale: missing.stale.length + extras.stale.length },
        missing: result.missing.map((f) => ({ method: f.method, path: f.backendPath, field: f.fieldPath, contract: f.contractName, call: `${f.file}:${f.line}`, frozen: baseline.missing.includes(findingKey(f)) })),
        extras: result.extras.map((f) => ({ method: f.method, path: f.backendPath, field: f.fieldPath, contract: f.contractName, frozen: baseline.extras.includes(findingKey(f)) })),
        unmatchedRoutes: result.unmatchedRoutes.map((f) => ({ method: f.method, pattern: f.pattern, call: `${f.file}:${f.line}` })),
        optionalOnBackend: result.optionalOnBackend.length,
      }),
    );
    return missing.fresh.length === 0 && extras.fresh.length === 0 ? 0 : 1;
  }

  return report(
    result,
    document,
    options,
    {
      calls: calls.length,
      contracts: schemas.size,
      records: records.length,
      unresolved: unresolved.length,
      loadFailures: failures.length,
    failures,
    },
    baseline,
  );
}

process.exitCode = await main();
