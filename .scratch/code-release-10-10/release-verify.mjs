#!/usr/bin/env node
/**
 * Ticket 41 -- one-commit release verification.
 *
 * Evidence gathered across a moving tree proves nothing about any one state of it,
 * so this refuses to produce an authoritative record unless BOTH repositories are
 * clean. They are separate git repositories, so a release is two SHAs, not one.
 *
 * Three rules this encodes, each of which the release has already been bitten by:
 *
 *   1. A gate that did not run is NOT a gate that passed. Every entry is classified
 *      PASS / FAIL / SKIP, a SKIP must name its prerequisite, and the three are never
 *      summed together.
 *   2. The exit code is not the result. Ticket 41 requires the tails be read, because
 *      a crashed tsc greps as "0 errors" and reports a false pass. Every tail is
 *      captured and scanned for crash signatures independently of the exit status.
 *   3. Spec typecheck is run EXPLICITLY. The backend build config excludes spec files,
 *      so a clean `typecheck` does not prove the specs compile.
 *
 * Usage:
 *   node release-verify.mjs                 # gates in both repos, refuses a dirty tree
 *   node release-verify.mjs --allow-dirty   # dry run, record is stamped NOT AUTHORITATIVE
 *   node release-verify.mjs --only=backend  # one repo
 *   node release-verify.mjs --gate=check:tenant-isolation   # a single gate, repeatable
 */
import { execFileSync, spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";

const BACKEND = "/Users/tarunchintakunta/Personal/streamline/streamlineos-backend";
const FRONTEND_REPO = "/Users/tarunchintakunta/Personal/streamline/streamlineos-frontend";
const FRONTEND = join(FRONTEND_REPO, "frontend");
const OUT = resolve("reports/release-verification");

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const val = (n) => argv.filter((a) => a.startsWith(`--${n}=`)).map((a) => a.slice(n.length + 3));
const ALLOW_DIRTY = flag("allow-dirty");
const ONLY = val("only")[0] ?? null;
const ONLY_GATES = val("gate");
// Long-running gates are opt-in: a build or a full suite can outlast a battery, and a
// harness that is killed half way through writes a record that looks like a clean pass.
const WITH_HEAVY = flag("with-heavy");
const TIMEOUT_MS = Number(val("timeout")[0] ?? 900_000);

/** Signatures that mean "this did not actually complete", regardless of exit status. */
const CRASH = [
  /JavaScript heap out of memory/i,
  /FATAL ERROR:/,
  /Killed: 9/,
  /ENOSPC|ENOMEM/,
  /Segmentation fault/i,
  /The operation was canceled/i,
];

/** Ticket 41 box 3 names these explicitly. `heavy` ones need --with-heavy. */
const BACKEND_GATES = [
  ["typecheck", { heavy: true, note: "needs 8GB heap; a crashed tsc greps as 0 errors" }],
  ["check:spec-typecheck", { note: "box 4: the build config excludes specs" }],
  ["build", { heavy: true }],
  ["openapi:check", {}],
  ["check:openapi-coverage", {}],
  ["check:openapi-path-params", {}],
  ["check:cycles", {}],
  ["check:file-sizes", {}],
  ["check:dead-code", {}],
  ["check:tenant-isolation", {}],
  ["check:tenant-indexes", {}],
  ["check:tenant-relationships", {}],
  ["db:verify-rls", { live: true }],
  ["verify:permissions", { live: true }],
  ["check:permission-keys", {}],
  ["check:navigation-permissions", {}],
  ["check:cache-invalidation", {}],
  ["check:cache-key-shapes", {}],
  ["check:outbox-consumers", {}],
  ["check:idempotent-commands", {}],
  ["check:migration-discipline", {}],
  ["check:migration-chain", {}],
  ["check:migration-ledger", {}],
  ["check:migration-rollback", { live: true }],
  ["check:lifecycle-predicates", {}],
  ["check:module-lifecycle", {}],
  ["check:public-object-urls", {}],
  ["check:audit-log-privileges", {}],
  ["check:vulnerabilities", { net: true }],
  ["check:licenses", { net: true }],
  ["sbom:generate", { net: true }],
];

const FRONTEND_GATES = [
  ["type-check", {}],
  ["build", { heavy: true, note: "needs a >=44 char local placeholder NEXTAUTH_SECRET" }],
  ["check:cycles", {}],
  ["check:file-sizes", {}],
  ["check:over-300", {}],
  ["check:dead-code", {}],
  ["check:type-assertions", {}],
  ["check:route-access-contract", {}],
  ["check:route-thinness", {}],
  ["check:client-pages", {}],
  ["check:effect-fetches", {}],
  ["check:query-scope", {}],
  ["check:query-signal", {}],
  ["check:import-direction", {}],
  ["check:empty-states", {}],
  ["check:icon-labels", {}],
  ["check:colors", {}],
  ["check:formatters", {}],
  ["check:module-manifest", {}],
  ["check:home-manifest", {}],
  ["check:command-catalog", {}],
  ["check:contract-drift", {}],
  ["check:contract-vendor", {}],
  ["check:seo-metadata", {}],
  ["check:routes", {}],
  ["check:web-vitals-budget", { needsBuild: true }],
  ["check:route-bundle-budget", { needsBuild: true }],
];

const git = (cwd, args) =>
  execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }).trim();

function repoState(cwd, name) {
  const sha = git(cwd, ["rev-parse", "HEAD"]);
  const branch = git(cwd, ["rev-parse", "--abbrev-ref", "HEAD"]);
  const dirty = git(cwd, ["status", "--porcelain"]);
  const files = dirty ? dirty.split("\n").filter(Boolean) : [];
  return { name, cwd, sha, branch, clean: files.length === 0, dirtyCount: files.length, dirtyFiles: files.slice(0, 40) };
}

function runGate(cwd, script, meta) {
  const started = Date.now();
  const r = spawnSync("pnpm", ["run", script], {
    cwd, encoding: "utf8", timeout: TIMEOUT_MS,
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, NODE_OPTIONS: process.env.NODE_OPTIONS ?? "--max-old-space-size=8192", CI: "1" },
  });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  const tail = out.split("\n").slice(-40).join("\n");
  const crashed = CRASH.find((re) => re.test(out));
  // Rule 2: the exit code is not the result. A crash signature outranks a 0.
  let status;
  if (r.error?.code === "ETIMEDOUT" || r.signal) status = "SKIP";
  else if (crashed) status = "CRASH";
  else status = r.status === 0 ? "PASS" : "FAIL";
  return {
    script, status, exitCode: r.status, signal: r.signal ?? null,
    crashSignature: crashed ? String(crashed) : null,
    durationMs: Date.now() - started,
    prerequisite: status === "SKIP" ? (r.signal ? `killed by ${r.signal}` : `exceeded ${TIMEOUT_MS}ms`) : null,
    note: meta.note ?? null, tail,
  };
}

function verifyRepo(state, gates) {
  const results = [];
  for (const [script, meta] of gates) {
    if (ONLY_GATES.length && !ONLY_GATES.includes(script)) continue;
    if (meta.heavy && !WITH_HEAVY) {
      results.push({ script, status: "SKIP", exitCode: null, prerequisite: "--with-heavy not passed", note: meta.note ?? null, tail: "" });
      continue;
    }
    process.stderr.write(`  [${state.name}] ${script} ... `);
    const res = runGate(state.cwd, script, meta);
    process.stderr.write(`${res.status}${res.exitCode === null ? "" : ` (${res.exitCode})`}\n`);
    results.push(res);
  }
  return results;
}

const backend = repoState(BACKEND, "backend");
const frontend = repoState(FRONTEND_REPO, "frontend");
const authoritative = backend.clean && frontend.clean;

if (!authoritative && !ALLOW_DIRTY) {
  console.error("REFUSING: a release record requires both trees clean at one commit.");
  console.error(`  backend  ${backend.sha.slice(0, 9)} on ${backend.branch}: ${backend.clean ? "clean" : `${backend.dirtyCount} dirty`}`);
  console.error(`  frontend ${frontend.sha.slice(0, 9)} on ${frontend.branch}: ${frontend.clean ? "clean" : `${frontend.dirtyCount} dirty`}`);
  console.error("Quiesce the agents and commit, or pass --allow-dirty for a NON-AUTHORITATIVE dry run.");
  process.exit(2);
}

process.stderr.write(`Release verification ${authoritative ? "(AUTHORITATIVE)" : "(DRY RUN -- NOT AUTHORITATIVE)"}\n`);
const record = {
  generatedAt: new Date().toISOString(),
  authoritative,
  reason: authoritative ? null : "one or both trees were dirty; this record does not describe a single commit",
  repos: { backend, frontend },
  heavyGatesRun: WITH_HEAVY,
  results: {},
};
if (ONLY !== "frontend") record.results.backend = verifyRepo(backend, BACKEND_GATES);
if (ONLY !== "backend") record.results.frontend = verifyRepo({ ...frontend, cwd: FRONTEND }, FRONTEND_GATES);

const all = [...(record.results.backend ?? []), ...(record.results.frontend ?? [])];
const tally = all.reduce((a, r) => ((a[r.status] = (a[r.status] ?? 0) + 1), a), {});
record.tally = tally;

mkdirSync(OUT, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const jsonPath = join(OUT, `release-verify-${stamp}.json`);
writeFileSync(jsonPath, JSON.stringify(record, null, 2));

const line = (r) => `| \`${r.script}\` | ${r.status} | ${r.exitCode ?? "-"} | ${r.prerequisite ?? r.note ?? ""} |`;
const md = `# Release verification — ${record.generatedAt}

${authoritative ? "**AUTHORITATIVE.**" : "**NOT AUTHORITATIVE** — " + record.reason}

| repo | branch | commit | tree |
|---|---|---|---|
| backend | ${backend.branch} | \`${backend.sha}\` | ${backend.clean ? "clean" : `${backend.dirtyCount} uncommitted`} |
| frontend | ${frontend.branch} | \`${frontend.sha}\` | ${frontend.clean ? "clean" : `${frontend.dirtyCount} uncommitted`} |

Two repositories, two commits. A change spanning both is not one SHA.

**Tally:** ${Object.entries(tally).map(([k, v]) => `${k} ${v}`).join(" · ") || "none"}
${WITH_HEAVY ? "" : "\nHeavy gates (build, backend typecheck) were SKIPPED — pass `--with-heavy` to include them. They are skipped by default because a harness killed mid-build writes a record that reads like a clean pass.\n"}
## backend
| gate | status | exit | prerequisite / note |
|---|---|---|---|
${(record.results.backend ?? []).map(line).join("\n")}

## frontend
| gate | status | exit | prerequisite / note |
|---|---|---|---|
${(record.results.frontend ?? []).map(line).join("\n")}

## Failing and crashed tails
${all.filter((r) => r.status === "FAIL" || r.status === "CRASH").map((r) => `\n### ${r.script} — ${r.status}${r.crashSignature ? ` (crash signature ${r.crashSignature})` : ""}\n\`\`\`\n${r.tail}\n\`\`\``).join("\n") || "\nNone."}
`;
const mdPath = join(OUT, `release-verify-${stamp}.md`);
writeFileSync(mdPath, md);
console.log(`\n${JSON.stringify(tally)}\n${jsonPath}\n${mdPath}`);
// A SKIP is not a pass. Exit non-zero unless every gate genuinely passed.
process.exit(all.every((r) => r.status === "PASS") ? 0 : 1);
