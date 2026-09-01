#!/usr/bin/env node

import { execSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, relative, resolve as pathResolve, basename, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SCRIPT_DIR, "..");

const NEXT_CONVENTION_STEMS = new Set([
  "page", "layout", "loading", "error", "not-found", "route", "template",
  "default", "global-error", "sitemap", "robots", "manifest", "icon",
  "apple-icon", "opengraph-image", "twitter-image",
]);

const CONTRACT_BARRELS = new Set([
  "components/shared/index.ts",
  "components/ai/index.ts",
  "components/illustrations/index.ts",
  "components/wizard-shell/index.ts",
  "components/labels/index.ts",
]);

const FEATURE_BARREL_RE = /^features\/[^/]+\/(?:[^/]+\/)?index\.ts$/;

const CRM_INVENTORY_RE =
  /^(?:hooks\/api\/crm\/|features\/crm\/|types\/crm\/|features\/inventory\/|hooks\/api\/inventory\/|hooks\/api\/leads\.)/;

const SCRIPTS_RE = /^scripts\//;

const TEST_INFRA_RE = /^test-utils\//;

const PRE_IMPLEMENTATION_CONTRACTS = new Set([
  "lib/backend-token-contract.ts",
]);

const SKIP_DIRS = new Set(["node_modules", ".next", "feedbucket-widget", ".git"]);

const BASELINE = { deadFiles: 0, deadExports: 0 };

const SCAN_FLOOR = { knipTotal: 5, graphFiles: 100, graphEdges: 300 };

const EXPORT_VERDICTS = new Map([
  ["hooks/api/workflows.ts:useWorkflowSchedules", { verdict: "DEFERRED", reason: "Product owner: Workflow PM; review 2026-10-01; per-workflow schedule CRUD awaits the scheduler page" }],
  ["hooks/api/workflows.ts:useCreateSchedule", { verdict: "DEFERRED", reason: "Product owner: Workflow PM; review 2026-10-01; create action awaits the scheduler page" }],
  ["hooks/api/workflows.ts:useWorkflowSecrets", { verdict: "DEFERRED", reason: "Product owner: Workflow PM; review 2026-10-01; per-workflow secrets panel is not in the current release" }],
  ["hooks/api/workflows.ts:useCreateWorkflowSecret", { verdict: "DEFERRED", reason: "Product owner: Workflow PM; review 2026-10-01; create action awaits the secrets panel" }],
  ["hooks/api/workflows.ts:useDeleteWorkflowSecret", { verdict: "DEFERRED", reason: "Product owner: Workflow PM; review 2026-10-01; delete action awaits the secrets panel" }],
  ["hooks/api/workflows.ts:TriggerType", { verdict: "KEEP", reason: "re-exported contract type used by Workflow.triggerType and consumed through live workflow query data" }],
  ["hooks/api/workflows.ts:ApprovalStatus", { verdict: "KEEP", reason: "re-exported contract type used by WorkflowApproval.status and consumed through live approval query data" }],
  ["hooks/api/workflows.ts:WorkflowSortField", { verdict: "KEEP", reason: "re-exported contract type used by live useWorkflows parameter contract" }],
  ["hooks/api/workflows.ts:SortDirection", { verdict: "KEEP", reason: "re-exported contract type used by live workflow and execution list parameter contracts" }],
  ["hooks/api/workflows.ts:WorkflowVersion", { verdict: "KEEP", reason: "re-exported response type used by the live publish-workflow API call" }],
  ["hooks/api/workflows.ts:WorkflowAnalytics", { verdict: "KEEP", reason: "re-exported response type used by live useWorkflowAnalytics data consumed on the workflow page" }],
  ["hooks/api/workflows.ts:WorkflowCursorPage", { verdict: "KEEP", reason: "re-exported response wrapper used by live workflow and execution list API calls" }],
  ["hooks/api/workflows.ts:WorkflowListParams", { verdict: "KEEP", reason: "re-exported parameter type used by live useWorkflows calls on the workflow list page" }],
  ["hooks/api/workflows.ts:ExecutionListParams", { verdict: "KEEP", reason: "re-exported parameter type used by live execution list hooks and page calls" }],

  ["hooks/api/workflows-secrets.ts:useWorkflowSecrets", { verdict: "DEFERRED", reason: "Product owner: Workflow PM; review 2026-10-01; secrets panel is not in the current release" }],
  ["hooks/api/workflows-secrets.ts:useCreateWorkflowSecret", { verdict: "DEFERRED", reason: "Product owner: Workflow PM; review 2026-10-01; action awaits the secrets panel" }],
  ["hooks/api/workflows-secrets.ts:useDeleteWorkflowSecret", { verdict: "DEFERRED", reason: "Product owner: Workflow PM; review 2026-10-01; action awaits the secrets panel" }],

  ["hooks/api/workflows-schedules.ts:useWorkflowSchedules", { verdict: "DEFERRED", reason: "Product owner: Workflow PM; review 2026-10-01; schedules panel is not in the current release" }],
  ["hooks/api/workflows-schedules.ts:useCreateSchedule", { verdict: "DEFERRED", reason: "Product owner: Workflow PM; review 2026-10-01; action awaits the schedules panel" }],


  ["features/hr/expenses/expense-stats.tsx:MemberExpenseStats", { verdict: "DEFERRED", reason: "Product owner: HR PM; review 2026-10-01; member expense stats awaits the self-service expense surface" }],

  ["hooks/api/accounting/banking.ts:useBankImports", { verdict: "DEFERRED", reason: "Product owner: Accounting PM; review 2026-10-01; bank-import list UI awaits the banking release" }],

  ["hooks/api/onboarding-flow.ts:useModuleChecklist", { verdict: "DEFERRED", reason: "Product owner: Onboarding PM; review 2026-10-01; per-module checklist detail UI awaits the onboarding release" }],
  ["hooks/api/onboarding-flow.ts:useSkipChecklistItem", { verdict: "DEFERRED", reason: "Product owner: Onboarding PM; review 2026-10-01; checklist skip action awaits the onboarding release" }],
  ["hooks/api/onboarding-flow.ts:useRestartModuleChecklist", { verdict: "DEFERRED", reason: "Product owner: Onboarding PM; review 2026-10-01; checklist restart action awaits the onboarding release" }],

  ["hooks/api/party/subjects.ts:useDeleteSubject", { verdict: "DEFERRED", reason: "Product owner: Platform PM; review 2026-10-01; party deletion awaits the retention/approval UX" }],


  ["hooks/api/accounting/ar-collections.ts:useCollectionActivities", { verdict: "DEFERRED", reason: "Product owner: Accounting PM; review 2026-10-01; collection activities UI awaits the AR release" }],
  ["hooks/api/accounting/ap-payment-runs.ts:useVendorPayments", { verdict: "DEFERRED", reason: "Product owner: Accounting PM; review 2026-10-01; vendor payments UI awaits the AP release" }],

  ["hooks/api/build/teams.ts:useProjectTeamMembers", { verdict: "DEFERRED", reason: "Product owner: Build PM; review 2026-10-01; team-member management UI awaits the Build release" }],

  ["hooks/api/inbox.ts:useInfiniteInbox", { verdict: "DEFERRED", reason: "Product owner: Inbox PM; review 2026-10-01; legacy /me/inbox remains retained for compatibility while unified inbox is canonical" }],
  ["hooks/api/inbox.ts:useInboxCount", { verdict: "DEFERRED", reason: "Product owner: Inbox PM; review 2026-10-01; legacy /me/inbox/count remains retained for compatibility" }],

  ["hooks/api/hr/attendance.ts:useAttendanceHeatmap", { verdict: "DEFERRED", reason: "Product owner: HR PM; review 2026-10-01; attendance heatmap awaits the analytics release" }],

  ["hooks/api/hr/recruitment/interviews.ts:SlaReportStage", { verdict: "KEEP", reason: "nested in live HrSlaReport response consumed by the SLA report page" }],
  ["hooks/api/hr/recruitment/interviews.ts:SlaReportMonth", { verdict: "KEEP", reason: "nested in live HrSlaReport response consumed by the SLA report page and chart" }],
  ["hooks/api/hr/recruitment/interviews.ts:SlaReportStageSummary", { verdict: "KEEP", reason: "nested in live HrSlaReport response used by the SLA report page" }],
  ["hooks/api/hr/recruitment/interviews.ts:BusyBlock", { verdict: "KEEP", reason: "nested in live InterviewerAvailabilityResponse returned by useInterviewerAvailability" }],

  ["hooks/api/roles.ts:RoleTemplate", { verdict: "KEEP", reason: "return type of useRoleTemplates hook; feature consumers infer the type from hook return; no explicit import required" }],

  ["hooks/api/module-access/index.ts:ModuleRolePermission", { verdict: "KEEP", reason: "part of ModuleRoleGroup.permissions; consumers infer via hook return type, no explicit import needed" }],
  ["hooks/api/module-access/index.ts:ModuleMemberCandidate", { verdict: "KEEP", reason: "return type of useModuleMemberCandidates; inferred structurally, no explicit import needed" }],
  ["hooks/api/module-access/index.ts:ModuleOwnership", { verdict: "KEEP", reason: "return type of useModuleOwnership; inferred structurally" }],
  ["hooks/api/module-access/index.ts:MemberGrant", { verdict: "KEEP", reason: "return element type of useModuleMemberGrants; inferred structurally" }],
  ["hooks/api/module-access/index.ts:Pagination", { verdict: "KEEP", reason: "internal pagination shape within PaginatedResult; used in hook return types inferred by consumers" }],
  ["hooks/api/module-access/index.ts:PaginatedResult", { verdict: "KEEP", reason: "wrapper type for paginated hook responses; inferred by consumers through hook return types" }],
  ["hooks/api/module-access/index.ts:CursorPaginatedResult", { verdict: "KEEP", reason: "cursor-pagination wrapper type; inferred by consumers through hook return types" }],
  ["hooks/api/module-access/index.ts:AuditCursorPage", { verdict: "KEEP", reason: "audit log cursor page type; inferred by consumers through useModuleAuditLog return type" }],
  ["hooks/api/module-access/index.ts:ModuleMyPermissions", { verdict: "KEEP", reason: "return type of useModuleMyPermissions; inferred structurally by feature consumers" }],

  ["hooks/api/module-access/types.ts:PaginatedResult", { verdict: "KEEP", reason: "source definition re-exported through barrel; used structurally inside module-access hooks" }],

  ["lib/command-catalog.ts:NotificationCommandName", { verdict: "KEEP", reason: "keyof typeof NOTIFICATION_COMMANDS — available for consumers that need a typed command-name union without importing the full catalog" }],
  ["lib/command-catalog.ts:ChatCommandName", { verdict: "KEEP", reason: "keyof typeof CHAT_COMMANDS — available for consumers that need a typed command-name union without importing the full catalog" }],
  ["lib/command-catalog.ts:CommandDomain", { verdict: "KEEP", reason: "keyof typeof ALL_COMMANDS — available for consumers that iterate over command domains" }],
  ["features/hr/expenses/expense-constants.ts:ReceiptFileKind", { verdict: "KEEP", reason: "re-exported type from lib/expense-receipts; provides stable import path for consumers that need the kind union without importing the full receipts module" }],
]);

function checkStaleVerdicts(verdicts, processedKeys) {
  const stale = [];
  for (const key of verdicts.keys()) {
    if (!processedKeys.has(key)) stale.push(key);
  }
  return stale;
}

function toFwd(p) {
  return p.replace(/\\/g, "/");
}

function tryFile(p) {
  try {
    const s = statSync(p);
    return s.isFile() ? p : null;
  } catch {
    return null;
  }
}

function findFile(spec, fromDir, root) {
  let base;
  if (spec.startsWith("@/")) base = join(root, spec.slice(2));
  else if (spec.startsWith(".")) base = pathResolve(fromDir, spec);
  else return null;

  if (tryFile(base)) return base;
  for (const ext of [".ts", ".tsx"]) {
    const r = tryFile(base + ext);
    if (r) return r;
  }
  const idxTs = join(base, "index.ts");
  if (tryFile(idxTs)) return idxTs;
  const idxTsx = join(base, "index.tsx");
  if (tryFile(idxTsx)) return idxTsx;
  return null;
}

function* walkTs(dir) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) yield* walkTs(full);
    else if (/\.(ts|tsx)$/.test(e.name)) yield full;
  }
}

function buildImporterMap(root) {
  const map = new Map();

  function record(target, importer, kind) {
    if (!target) return;
    if (!map.has(target)) {
      map.set(target, { sideEffect: new Set(), named: new Set(), reexport: new Set(), dynamic: new Set() });
    }
    map.get(target)[kind].add(importer);
  }

  for (const file of walkTs(root)) {
    let src;
    try { src = readFileSync(file, "utf8"); } catch { continue; }
    const fromDir = dirname(file);

    for (const line of src.split("\n")) {
      const m = line.match(/^\s*import\s+["']([^"']+)["']\s*;?\s*$/);
      if (m) record(findFile(m[1], fromDir, root), file, "sideEffect");
    }

    let m;
    const namedRe = /^import\s+(?:type\s+)?(?:\{[^}]+\}|\*\s+as\s+\w+|\w+)\s+from\s+["']([^"']+)["']/gm;
    while ((m = namedRe.exec(src)) !== null) {
      record(findFile(m[1], fromDir, root), file, "named");
    }

    const reRe = /^export\s+(?:type\s+)?(?:\{[^}]+\}|\*[^"'\n]*)\s+from\s+["']([^"']+)["']/gm;
    while ((m = reRe.exec(src)) !== null) {
      record(findFile(m[1], fromDir, root), file, "reexport");
    }

    const dynRe = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
    while ((m = dynRe.exec(src)) !== null) {
      record(findFile(m[1], fromDir, root), file, "dynamic");
    }
  }

  return map;
}

function classifyFile(relPath, knipDeadSet, importerMap, root) {
  const stem = basename(relPath).replace(/\.[^.]+$/, "");
  if (NEXT_CONVENTION_STEMS.has(stem)) {
    return { cls: "RETAINED-BY-CONVENTION", reason: "Next.js filesystem entry convention" };
  }
  if (SCRIPTS_RE.test(relPath)) {
    return { cls: "RETAINED-BY-CONVENTION", reason: "standalone executable script, not a module" };
  }
  if (TEST_INFRA_RE.test(relPath)) {
    return { cls: "RETAINED-BY-CONVENTION", reason: "test-infrastructure utility; no current consumer — the path exists for future tests" };
  }
  if (PRE_IMPLEMENTATION_CONTRACTS.has(relPath)) {
    return { cls: "RETAINED-BY-CONVENTION", reason: "AR-01 pre-implementation contract — consumers are being written in the token-authority lane; no importers yet is the expected state" };
  }

  const absPath = join(root, ...relPath.split("/"));
  const entry = importerMap.get(absPath);

  if (entry) {
    for (const [kind, importers] of Object.entries(entry)) {
      for (const imp of importers) {
        const impRel = toFwd(relative(root, imp));
        if (!knipDeadSet.has(impRel)) {
          const reason =
            kind === "sideEffect" ? `side-effect import from live file (${impRel})`
            : kind === "reexport" ? `re-exported from live barrel (${impRel})`
            : kind === "dynamic" ? `dynamic import from live file (${impRel})`
            : `named import from live file (${impRel})`;
          return { cls: "RETAINED-BY-CONTRACT", reason };
        }
      }
    }
  }

  return { cls: "DEAD", reason: "no live importers found in module graph" };
}

function classifyExport(filePath, name) {
  if (CONTRACT_BARRELS.has(filePath)) {
    return { cls: "RETAINED-BY-CONTRACT", reason: "named intentional barrel" };
  }
  if (FEATURE_BARREL_RE.test(filePath)) {
    return { cls: "RETAINED-BY-CONTRACT", reason: "feature barrel extension point" };
  }
  if (TEST_INFRA_RE.test(filePath)) {
    return { cls: "RETAINED-BY-CONVENTION", reason: "test-infrastructure utility; exports are available for all test suites" };
  }
  if (CRM_INVENTORY_RE.test(filePath)) {
    return { cls: "EXCLUDED", reason: "CRM/Inventory excluded from PRD scope; not counted in dead-code baseline" };
  }
  const key = `${filePath}:${name}`;
  if (EXPORT_VERDICTS.has(key)) {
    const { verdict, reason } = EXPORT_VERDICTS.get(key);
    return { cls: verdict, reason };
  }
  return { cls: "UNCLASSIFIED", reason: "no verdict recorded in EXPORT_VERDICTS; add a WIRE/KEEP entry to resolve" };
}

function assert(cond, msg) {
  if (!cond) { console.error("SELF-TEST FAIL:", msg); process.exit(1); }
}

function runSelfTest() {
  console.log("Running self-test...\n");

  const synthRoot = join(sep === "\\" ? "C:\\synthetic" : "/synthetic");
  const knipDeadSet = new Set(["dead.ts", "side-effect-dep.ts", "reexport-source.ts"]);

  const sideEffectDepAbs = join(synthRoot, "side-effect-dep.ts");
  const reexportSourceAbs = join(synthRoot, "reexport-source.ts");
  const liveEntryAbs = join(synthRoot, "live-entry.ts");
  const liveBarrelAbs = join(synthRoot, "live-barrel.ts");

  const synthMap = new Map([
    [
      sideEffectDepAbs,
      { sideEffect: new Set([liveEntryAbs]), named: new Set(), reexport: new Set(), dynamic: new Set() },
    ],
    [
      reexportSourceAbs,
      { sideEffect: new Set(), named: new Set(), reexport: new Set([liveBarrelAbs]), dynamic: new Set() },
    ],
  ]);

  const r1 = classifyFile("dead.ts", knipDeadSet, synthMap, synthRoot);
  const r2 = classifyFile("side-effect-dep.ts", knipDeadSet, synthMap, synthRoot);
  const r3 = classifyFile("reexport-source.ts", knipDeadSet, synthMap, synthRoot);

  assert(r1.cls === "DEAD",
    `(a) dead.ts → expected DEAD, got ${r1.cls}`);
  assert(r2.cls === "RETAINED-BY-CONTRACT",
    `(b) side-effect-dep.ts → expected RETAINED-BY-CONTRACT, got ${r2.cls}`);
  assert(r3.cls === "RETAINED-BY-CONTRACT",
    `(c) reexport-source.ts → expected RETAINED-BY-CONTRACT, got ${r3.cls}`);

  const r4 = classifyExport("features/some-feature/index.ts", "SomeThing");
  assert(r4.cls === "RETAINED-BY-CONTRACT",
    `(d) feature barrel export → expected RETAINED-BY-CONTRACT, got ${r4.cls}`);

  const r5 = classifyExport("hooks/api/crm/metadata.ts", "SomeExport");
  assert(r5.cls === "EXCLUDED",
    `(e) CRM export → expected EXCLUDED, got ${r5.cls}`);

  const r6 = classifyExport("hooks/api/some-new-hook.ts", "useNewHook");
  assert(r6.cls === "UNCLASSIFIED",
    `(i) unclassified export → expected UNCLASSIFIED (gate would fail), got ${r6.cls}`);

  const r7 = classifyExport("hooks/api/workflows.ts", "useWorkflowSchedules");
  assert(r7.cls === "DEFERRED",
    `(j) DEFERRED verdict → expected DEFERRED, got ${r7.cls}`);

  const r8 = classifyExport("hooks/api/roles.ts", "RoleTemplate");
  assert(r8.cls === "KEEP",
    `(k) KEEP verdict → expected KEEP, got ${r8.cls}`);

  const fakeVerdicts = new Map([["hooks/api/ghost.ts:useGhost", { verdict: "WIRE", reason: "test" }]]);
  const stale = checkStaleVerdicts(fakeVerdicts, new Set());
  assert(stale.length === 1 && stale[0] === "hooks/api/ghost.ts:useGhost",
    `(l) stale verdict detection → expected [hooks/api/ghost.ts:useGhost], got [${stale.join(",")}]`);

  const r9 = classifyFile("test-utils/render.tsx", new Set(), new Map(), synthRoot);
  assert(r9.cls === "RETAINED-BY-CONVENTION",
    `(m) test-infra file → expected RETAINED-BY-CONVENTION, got ${r9.cls}`);

  const r10 = classifyExport("test-utils/index.ts", "makeQueryClient");
  assert(r10.cls === "RETAINED-BY-CONVENTION",
    `(n) test-infra export → expected RETAINED-BY-CONVENTION, got ${r10.cls}`);

  const fixtureDir = join(tmpdir(), `dead-code-self-test-${Date.now()}`);
  try {
    mkdirSync(fixtureDir, { recursive: true });
    writeFileSync(join(fixtureDir, "entry.ts"),
      'import x from "./a";\nimport "./b";\nexport * from "./c";\n');
    writeFileSync(join(fixtureDir, "a.ts"), "export default 1;\n");
    writeFileSync(join(fixtureDir, "b.ts"), "export {};\n");
    writeFileSync(join(fixtureDir, "c.ts"), "export const C = 1;\n");

    const fixMap = buildImporterMap(fixtureDir);
    const entryAbs = join(fixtureDir, "entry.ts");
    const aAbs = join(fixtureDir, "a.ts");
    const bAbs = join(fixtureDir, "b.ts");
    const cAbs = join(fixtureDir, "c.ts");

    assert(fixMap.has(aAbs) && fixMap.get(aAbs).named.has(entryAbs),
      "(f) buildImporterMap: named import edge a.ts ← entry.ts not recorded");
    assert(fixMap.has(bAbs) && fixMap.get(bAbs).sideEffect.has(entryAbs),
      "(g) buildImporterMap: side-effect import edge b.ts ← entry.ts not recorded");
    assert(fixMap.has(cAbs) && fixMap.get(cAbs).reexport.has(entryAbs),
      "(h) buildImporterMap: re-export edge c.ts ← entry.ts not recorded");
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }

  console.log("PASS: self-test (14 assertions)\n");
  console.log("  (a) file with no live importers                       → DEAD");
  console.log("  (b) file reachable via side-effect import             → RETAINED-BY-CONTRACT");
  console.log("  (c) file reachable via re-export from live barrel     → RETAINED-BY-CONTRACT");
  console.log("  (d) export from feature barrel                        → RETAINED-BY-CONTRACT");
  console.log("  (e) export from CRM domain                            → EXCLUDED");
  console.log("  (f) buildImporterMap: named import edge recorded");
  console.log("  (g) buildImporterMap: side-effect import edge recorded");
  console.log("  (h) buildImporterMap: re-export edge recorded");
  console.log("  (i) export with no EXPORT_VERDICTS entry              → UNCLASSIFIED (gate bites)");
  console.log("  (j) export with DEFERRED verdict in EXPORT_VERDICTS   → DEFERRED");
  console.log("  (k) export with KEEP verdict in EXPORT_VERDICTS       → KEEP");
  console.log("  (l) EXPORT_VERDICTS entry not in knip output          → stale (gate bites)");
  console.log("  (m) test-utils file                                   → RETAINED-BY-CONVENTION");
  console.log("  (n) test-utils export                                 → RETAINED-BY-CONVENTION");
}

async function runMain() {
  let knipJson;
  try {
    let rawOut;
    try {
      rawOut = execSync("pnpm exec knip --no-progress --reporter json", {
        cwd: ROOT, encoding: "utf8", maxBuffer: 20 * 1024 * 1024,
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (e) {
      rawOut = e.stdout;
      if (!rawOut) { console.error("knip run failed:", e.stderr ?? e.message); process.exit(1); }
    }
    knipJson = JSON.parse(rawOut);
  } catch (e) {
    console.error("knip JSON parse failed:", e.message);
    process.exit(1);
  }

  const issues = knipJson.issues ?? [];
  const deadFileRels = [];
  const deadExportItems = [];

  for (const issue of issues) {
    for (const f of issue.files ?? []) deadFileRels.push(f.name);
    for (const ex of issue.exports ?? []) deadExportItems.push({ file: issue.file, name: ex.name, kind: "export" });
    for (const ty of issue.types ?? []) deadExportItems.push({ file: issue.file, name: ty.name, kind: "type" });
  }

  const knipDeadSet = new Set(deadFileRels);

  const knipTotal = deadFileRels.length + deadExportItems.length;
  if (knipTotal < SCAN_FLOOR.knipTotal) {
    console.error(
      `FAIL: knip returned only ${deadFileRels.length} files and ` +
      `${deadExportItems.length} exports/types — scan looks broken, not clean.`
    );
    process.exit(1);
  }

  console.log("Building import graph (scanning all TS/TSX files)...");
  const importerMap = buildImporterMap(ROOT);

  const graphFileCount = importerMap.size;
  let graphEdgeCount = 0;
  for (const entry of importerMap.values()) {
    for (const set of Object.values(entry)) graphEdgeCount += set.size;
  }
  if (graphFileCount < SCAN_FLOOR.graphFiles || graphEdgeCount < SCAN_FLOOR.graphEdges) {
    console.error(
      `FAIL: module-graph walk resolved only ${graphFileCount} files / ` +
      `${graphEdgeCount} import edges — scan looks broken.`
    );
    process.exit(1);
  }

  const buckets = {
    "DEAD": [],
    "RETAINED-BY-CONTRACT": [],
    "RETAINED-BY-CONVENTION": [],
    "WIRE": [],
    "DEFERRED": [],
    "KEEP": [],
    "EXCLUDED": [],
    "UNCLASSIFIED": [],
  };

  for (const rel of deadFileRels) {
    const r = classifyFile(rel, knipDeadSet, importerMap, ROOT);
    buckets[r.cls].push({ type: "file", path: rel, reason: r.reason });
  }

  const processedVerdictKeys = new Set();

  for (const ex of deadExportItems) {
    const r = classifyExport(ex.file, ex.name);
    if (r.cls === "WIRE" || r.cls === "DEFERRED" || r.cls === "KEEP") {
      processedVerdictKeys.add(`${ex.file}:${ex.name}`);
    }
    buckets[r.cls].push({ type: ex.kind, path: ex.file, name: ex.name, reason: r.reason });
  }

  const staleVerdicts = checkStaleVerdicts(EXPORT_VERDICTS, processedVerdictKeys);

  console.log("\n=== Dead Code Classification ===\n");
  console.log(
    `knip raw: files=${deadFileRels.length}` +
    ` exports=${deadExportItems.filter((e) => e.kind === "export").length}` +
    ` types=${deadExportItems.filter((e) => e.kind === "type").length}`
  );

  for (const [label, items] of Object.entries(buckets)) {
    console.log(`\n${label} (${items.length}):`);
    if (items.length === 0) { console.log("  (none)"); continue; }
    for (const it of items) {
      const name = it.name ? `:${it.name}` : "";
      console.log(`  [${it.type}] ${it.path}${name}  — ${it.reason}`);
    }
  }

  const deadFiles = buckets["DEAD"].filter((i) => i.type === "file").length;
  const deadExports = buckets["DEAD"].filter((i) => i.type !== "file").length;

  console.log(`\n=== Baseline: files=${BASELINE.deadFiles} exports=${BASELINE.deadExports} ===`);
  console.log(`=== Current:  files=${deadFiles} exports=${deadExports} ===`);

  if (staleVerdicts.length > 0) {
    console.error(
      `\nFAIL: ${staleVerdicts.length} stale EXPORT_VERDICTS entr${staleVerdicts.length === 1 ? "y" : "ies"} ` +
      `(export no longer dead — remove from EXPORT_VERDICTS or confirm it regressed):`
    );
    for (const key of staleVerdicts) console.error(`  ${key}`);
    process.exit(1);
  }

  if (buckets["UNCLASSIFIED"].length > 0) {
    console.error(
      `\nFAIL: ${buckets["UNCLASSIFIED"].length} unclassified export(s) — add a WIRE or KEEP entry to EXPORT_VERDICTS for each:`
    );
    for (const it of buckets["UNCLASSIFIED"]) {
      console.error(`  ${it.path}:${it.name}`);
    }
    process.exit(1);
  }

  if (deadFiles > BASELINE.deadFiles || deadExports > BASELINE.deadExports) {
    console.error("\nFAIL: dead code count exceeds baseline. New dead code introduced.");
    process.exit(1);
  }

  console.log("\nPASS: dead code within baseline.");
}

const args = process.argv.slice(2);
if (args.includes("--self-test")) {
  runSelfTest();
} else {
  runMain().catch((e) => { console.error(e); process.exit(1); });
}
