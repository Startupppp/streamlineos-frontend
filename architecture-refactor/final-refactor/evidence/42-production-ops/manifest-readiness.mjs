#!/usr/bin/env node
/**
 * Pre-flight indexer for the production-ops evidence gate.
 *
 * This script does NOT define a second manifest format and it cannot produce a
 * passing manifest. The one format is
 * `streamlineos.production-ops-evidence/v1`, owned by
 * `backend/src/scripts/production-ops-evidence.mjs`. Capture and verification
 * stay there. This tool only answers three questions that script does not:
 *
 *   1. What has actually been deposited under each RB-01..RB-08, and what is
 *      the sha256 and byte count of each file? (the "content hashes" half of
 *      PRD-C175 is computable locally; the rest is not)
 *   2. Which of those files would be REFUSED by capture because they contain
 *      self-test / dry-run / mock / fixture / fake / simulation wording? Local
 *      drill output is refused by design, and finding that out at capture time
 *      on a deployed run is too late.
 *   3. Which files will break `ops:evidence:check` merely by existing — any
 *      bare `.json` under this root is parsed as a manifest and fails.
 *
 * `--emit-skeleton RB-0N` writes an `RB-0N/<name>.input.json` whose artifact
 * list is pre-filled with the real paths already present, and whose every
 * deployed-only or human-only field is `null`. `null` is deliberate: it makes
 * the existing gate reject the skeleton with a precise message per field until
 * a named operator fills it in from a real deployed run. A skeleton can never
 * be mistaken for evidence, and can never be captured unfilled.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, lstatSync } from "node:fs";
import { relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));

const RUNBOOKS = ["RB-01", "RB-02", "RB-03", "RB-04", "RB-05", "RB-06", "RB-07", "RB-08"];

/** Mirrors the gate's own regexes so refusal is discovered before a deployed run, not after. */
const FORBIDDEN = /(?:--self-test|--dry-run|\bmock\b|\bfixture\b|\bfake\b|\bsimulat(?:e|ed|ion)\b)/i;
const SECRET =
  /(?:password|secret|token|api[_-]?key)\s*["']?\s*[:=]\s*["']?(?!<redacted>|\[redacted\]|redacted\b)[^\s,"'}]{8,}/i;

/** Required assertion ids, copied from the gate. Kept here only to render the checklist. */
const REQUIRED_ASSERTIONS = {
  "RB-01": ["independent-resource-identity", "cross-cell-credential-boundary"],
  "RB-02": ["pitr-retention", "restore-rpo"],
  "RB-03": ["physical-replica", "measured-replica-lag", "primary-fallback"],
  "RB-04": ["cell-recovery-rto-rpo", "regional-recovery", "organization-relocation"],
  "RB-05": ["production-shaped-load", "tenant-isolation-under-load", "headroom-40-percent"],
  "RB-06": ["live-alert-delivery", "human-acknowledgement", "release-observability"],
  "RB-07": ["invoice-derived-cell-cost", "seven-day-cost-trend", "operator-capacity-approval"],
  "RB-08": ["separate-resource-accounts", "per-cell-credentials", "separate-worker-deployment"],
};

function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

/** A directory belongs to a runbook when its top-level name starts with that id. */
function runbookOf(relPath) {
  const top = relPath.split("/")[0];
  return RUNBOOKS.find((rb) => top.startsWith(rb)) ?? null;
}

function describe(full) {
  const rel = relative(ROOT, full).replaceAll("\\", "/");
  if (lstatSync(full).isSymbolicLink()) {
    return { path: rel, error: "symlink — capture refuses symlinks" };
  }
  const bytes = readFileSync(full);
  const text = bytes.toString("utf8");
  return {
    path: rel,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    forbiddenWording: FORBIDDEN.test(text),
    looksUnredacted: SECRET.test(text),
    breaksVerify: rel.endsWith(".json") && !rel.endsWith(".input.json"),
  };
}

function index() {
  const files = walk(ROOT)
    .map((f) => relative(ROOT, f).replaceAll("\\", "/"))
    .filter((rel) => rel !== "README.md" && !rel.endsWith(".mjs") && !rel.endsWith(".md"))
    .map((rel) => describe(resolve(ROOT, rel)));

  const byRunbook = new Map(RUNBOOKS.map((rb) => [rb, []]));
  const unassigned = [];
  for (const file of files) {
    const rb = runbookOf(file.path);
    if (rb) byRunbook.get(rb).push(file);
    else unassigned.push(file);
  }
  return { byRunbook, unassigned, files };
}

function report() {
  const { byRunbook, unassigned, files } = index();
  const lines = [];
  lines.push("PRODUCTION-OPS EVIDENCE READINESS");
  lines.push("This is a pre-flight index, NOT a manifest and NOT evidence of a deployed run.");
  lines.push("");

  let admissibleTotal = 0;
  for (const rb of RUNBOOKS) {
    const found = byRunbook.get(rb);
    const admissible = found.filter((f) => !f.forbiddenWording && !f.looksUnredacted && !f.error);
    admissibleTotal += admissible.length;
    lines.push(`${rb}  files=${found.length}  admissible-as-deployed-artifact=${admissible.length}`);
    lines.push(`      required assertions: ${REQUIRED_ASSERTIONS[rb].join(", ")}`);
    for (const f of found) {
      const flags = [];
      if (f.error) flags.push(f.error);
      if (f.forbiddenWording) flags.push("REFUSED: self-test/dry-run/mock/fixture/fake/simulation wording");
      if (f.looksUnredacted) flags.push("REFUSED: looks like an unredacted credential");
      if (f.breaksVerify) flags.push("BREAKS ops:evidence:check: bare .json is parsed as a manifest");
      lines.push(
        `      - ${f.path}  ${f.bytes ?? "?"}B  sha256=${(f.sha256 ?? "").slice(0, 16)}…` +
          (flags.length ? `\n          ${flags.join("\n          ")}` : ""),
      );
    }
    if (found.length === 0) lines.push("      (nothing deposited)");
    lines.push("");
  }

  if (unassigned.length > 0) {
    lines.push("Not attributable to any RB-01..RB-08 directory:");
    for (const f of unassigned) {
      const flags = [];
      if (f.forbiddenWording) flags.push("would be REFUSED by capture");
      if (f.breaksVerify) flags.push("BREAKS ops:evidence:check");
      lines.push(`      - ${f.path}${flags.length ? `  [${flags.join("; ")}]` : ""}`);
    }
    lines.push("");
  }

  const breakers = files.filter((f) => f.breaksVerify);
  lines.push("PRD-C175 field readiness (per runbook, all eight required):");
  lines.push("  content hashes ......... COMPUTABLE HERE (sha256/bytes above)");
  lines.push("  exit code .............. COMPUTABLE HERE only for a command actually run here");
  lines.push("  timestamps ............. COMPUTABLE HERE only for a command actually run here");
  lines.push("  release SHA ............ BLOCKED: needs the SHA of a deployed build");
  lines.push("  topology sha256 ........ BLOCKED: needs a deployed topology export");
  lines.push("  identity (env/region/cell/https target) ... BLOCKED: needs a deployed cell");
  lines.push("  operator ............... BLOCKED: needs a named human's attestation");
  lines.push("");
  lines.push(`Files present: ${files.length}. Admissible as deployed artifacts today: ${admissibleTotal}.`);
  lines.push(`Bare .json files that will fail ops:evidence:check: ${breakers.length}.`);
  lines.push("");
  lines.push(
    "Local drill and self-test output is refused by capture on purpose. It is real evidence of the",
  );
  lines.push(
    "gate's and the drill's logic, but it is not evidence of a deployed cell, and PRD-C175 asks for",
  );
  lines.push("the latter. Do not attempt to launder one into the other.");
  process.stdout.write(lines.join("\n") + "\n");
  return breakers.length;
}

/**
 * Every deployed-only or human-only value is `null` so the real gate rejects the
 * skeleton field by field until a named operator fills it from an actual run.
 */
function emitSkeleton(runbook) {
  if (!RUNBOOKS.includes(runbook)) throw new Error(`unknown runbook ${runbook}; expected one of ${RUNBOOKS.join(", ")}`);
  const { byRunbook } = index();
  const artifacts = byRunbook
    .get(runbook)
    .filter((f) => !f.error && !f.breaksVerify)
    .map((f) => ({ path: f.path }));

  const skeleton = {
    _warning:
      "UNFILLED SKELETON — NOT EVIDENCE. Every null below must be replaced with an observed fact " +
      "from a real deployed run before ops:evidence:capture will accept it. Do not invent values.",
    runbook,
    evidenceKind: "deployed-operator-attested",
    live: null,
    environment: { name: null, region: null, cell: null, target: null },
    release: { sha: null, topologySha256: null },
    dataset: { shape: null, activeOrganizations: null },
    operator: { name: null, approvedAt: null },
    execution: { command: null, exitCode: null, startedAt: null, finishedAt: null },
    artifacts: artifacts.length > 0 ? artifacts : [{ path: null }],
    assertions: REQUIRED_ASSERTIONS[runbook].map((id) => ({
      id,
      result: null,
      artifact: null,
      observedAt: null,
    })),
  };

  const target = resolve(ROOT, runbook, "operator-skeleton.input.json");
  if (!target.endsWith(".input.json")) throw new Error("refusing to write a non-.input.json file");
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(skeleton, null, 2)}\n`, "utf8");
  process.stdout.write(`WROTE SKELETON ${relative(ROOT, target)} (ignored by the gate; unfillable by this script)\n`);
}

const args = process.argv.slice(2);
if (args.includes("--help")) {
  process.stdout.write(
    "manifest-readiness.mjs                    index evidence and report PRD-C175 field readiness\n" +
      "manifest-readiness.mjs --emit-skeleton RB-0N   write an unfilled operator .input.json skeleton\n",
  );
} else if (args[0] === "--emit-skeleton") {
  emitSkeleton(args[1]);
} else {
  const breakers = report();
  // Non-zero when a file will break the real gate, so this can be wired into CI later.
  process.exitCode = breakers > 0 ? 1 : 0;
}
