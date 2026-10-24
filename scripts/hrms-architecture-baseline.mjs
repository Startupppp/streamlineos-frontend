import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const suite = resolve(root, "docs/specs/hrms-payroll-reform");
const out = resolve(suite, "architecture-review/ap-00-baseline.json");
const sha = (buf) => createHash("sha256").update(buf).digest("hex");
const posix = (p) => relative(root, p).split("\\").join("/");
const git = (cwd, args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

function revision(cwd) {
  const dirty = git(cwd, ["status", "--porcelain"]).split("\n").filter(Boolean).map((line) => line.slice(3));
  return { head: git(cwd, ["rev-parse", "HEAD"]), dirty };
}

function walk(dir, keep, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name === ".next") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, keep, acc);
    else if (keep(full)) acc.push(full);
  }
  return acc;
}

function auditPaths() {
  const prd = readFileSync(resolve(suite, "16-architecture-hardening-prd.md"), "utf8");
  const coverage = JSON.parse(readFileSync(resolve(suite, "architecture-review/html-prd-coverage.json"), "utf8"));
  const paths = new Set();
  for (const line of prd.split("\n").filter((l) => l.startsWith("**Current source:**")))
    for (const m of line.matchAll(/`([^`]+)`/g)) paths.add(m[1]);
  for (const unit of coverage.units.filter((u) => u.disposition === "EVIDENCE"))
    for (const m of unit.text.matchAll(/((?:backend|frontend|docs|scripts)\/[\w./-]+?)(?=[:;,\s]|$)/g)) paths.add(m[1]);
  return [...paths].sort().map((path) => {
    const target = resolve(root, path);
    if (!existsSync(target)) return { path, state: "MISSING" };
    if (statSync(target).isDirectory()) return { path, state: "DIRECTORY", files: walk(target, (f) => /\.(ts|tsx|sql)$/.test(f)).length };
    return { path, state: "FILE", sha256: sha(readFileSync(target)) };
  });
}

function routes() {
  const dirs = ["hr", "payroll", "directory", "calendar"].map((d) => resolve(root, "backend/src/modules", d));
  const rows = [];
  for (const file of dirs.flatMap((d) => walk(d, (f) => f.endsWith(".controller.ts")))) {
    const text = readFileSync(file, "utf8");
    const base = text.match(/@Controller\(\s*["'`]([^"'`]*)["'`]/)?.[1] ?? "";
    const header = text.split(/\bexport class\b/)[0];
    const classModule = header.match(/@RequireModule\(\s*["'`]([^"'`]+)/)?.[1] ?? null;
    const classPermissions = [...header.matchAll(/@RequirePermission\(\s*["'`]([^"'`]+)/g)].map((m) => m[1]);
    const blocks = text.slice(header.length).split(/\n\s*\n/).filter((b) => /@(Get|Post|Put|Patch|Delete)\(/.test(b));
    for (const body of blocks) {
      const head = body.match(/@(Get|Post|Put|Patch|Delete)\(\s*(?:["'`]([^"'`]*)["'`])?/);
      const own = [...body.matchAll(/@RequirePermission\(\s*["'`]([^"'`]+)/g)].map((m) => m[1]);
      rows.push({
        method: head[1].toUpperCase(),
        path: "/" + [base, head[2] ?? ""].filter(Boolean).join("/"),
        permissions: own.length ? own : classPermissions,
        exposure: /@Public\(/.test(body) ? "public" : /@Universal\(/.test(body) ? "universal" : /@AuthorizedInService\(/.test(body) ? "in-service" : "permission",
        module: body.match(/@RequireModule\(\s*["'`]([^"'`]+)/)?.[1] ?? classModule,
        responseSchema: /@ResponseSchema\(/.test(body),
        handler: body.match(/^\s*(?:async\s+)?(\w+)\s*\((?=[\s\S]*\)\s*(?::[^{]*)?\{)/m)?.[1] ?? null,
        file: posix(file),
      });
    }
  }
  return rows;
}

function pages() {
  return walk(resolve(root, "frontend/app"), (f) => /[\\/]page\.tsx$/.test(f))
    .map(posix).filter((p) => /\/(hr|payroll|people|calendar)(\/|$)/.test(p)).sort();
}

function queryKeyFiles() {
  return walk(resolve(root, "frontend/lib/query-keys"), (f) => /(human-resources|payroll|hr)[\w-]*\.ts$/.test(f))
    .map((f) => ({ path: posix(f), sha256: sha(readFileSync(f)) }));
}

function grepFiles(dirs, pattern) {
  return dirs.flatMap((d) => walk(resolve(root, d), (f) => /\.ts$/.test(f) && !/\.spec\.ts$/.test(f)))
    .filter((f) => pattern.test(readFileSync(f, "utf8"))).map(posix).sort();
}

const baseline = {
  schemaVersion: 1,
  generatedBy: "scripts/hrms-architecture-baseline.mjs",
  generatedAt: new Date().toISOString(),
  revisions: { frontend: revision(root), backend: revision(resolve(root, "backend")) },
  instructionFiles: ["CLAUDE.md", "frontend/CLAUDE.md", "backend/CLAUDE.md", "CONTEXT.md", "backend/CONTEXT.md", "frontend/CONTEXT.md"]
    .map((path) => existsSync(resolve(root, path)) ? { path, sha256: sha(readFileSync(resolve(root, path))) } : { path, state: "MISSING" }),
  historicalGateScope: [
    { gate: "request-drift", scope: "Timesheets only", provesHr: false },
    { gate: "response parity", scope: "origin/main with unrelated Chat failures", provesHr: false },
    { gate: "static cache-key shape / read bounds", scope: "syntax of keys and limits", provesSemantics: false },
    { gate: "98 historical focused tests", scope: "audit evidence only", implementationEvidence: false },
  ],
  auditCriticalSources: auditPaths(),
  routes: routes(),
  frontendPages: pages(),
  queryKeyFiles: queryKeyFiles(),
  cacheWriters: grepFiles(["backend/src/modules/hr", "backend/src/modules/payroll"], /invalidate\w*\(|bumpNamespace|cacheService\.\w*(del|invalidate|bump)/i),
  eventConsumers: grepFiles(["backend/src/modules/hr", "backend/src/modules/payroll", "backend/src/modules/calendar"], /@OnEvent\(|implements\s+\w*Consumer|registerConsumer|outbox/i),
};
writeFileSync(out, JSON.stringify(baseline, null, 2) + "\n");
const missing = baseline.auditCriticalSources.filter((s) => s.state === "MISSING");
process.stdout.write(`baseline: ${baseline.auditCriticalSources.length} audit paths (${missing.length} missing), ${baseline.routes.length} routes, ${baseline.frontendPages.length} pages, ${baseline.cacheWriters.length} cache writers, ${baseline.eventConsumers.length} consumers\n`);
for (const m of missing) process.stdout.write("MISSING " + m.path + "\n");
