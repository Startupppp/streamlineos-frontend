import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const suite = resolve(root, "docs/specs/hrms-payroll-reform");
const sha = (text) => createHash("sha256").update(text).digest("hex");
const statuses = new Set(["NOT_STARTED", "DESIGNED", "IMPLEMENTED_UNVERIFIED", "PASS", "FAIL", "WAIVED"]);
const levels = new Set(["source", "unit", "contract", "database", "browser", "provider", "human"]);
const present = (value) => typeof value === "string" && value.trim().length > 0;
const pointPattern = /<!-- ARCH-POINT (HTML-\d{4}) -->([\s\S]*?)<!-- \/ARCH-POINT \1 -->/g;

function textOf(html) {
  return html.replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ").replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:amp|lt|gt|quot|apos|nbsp|#\d+|#x[0-9a-f]+);/gi, (entity) => {
      const key = entity.slice(1, -1).toLowerCase();
      return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " }[key]
        ?? String.fromCodePoint(parseInt(key.slice(key.startsWith("#x") ? 2 : 1), key.startsWith("#x") ? 16 : 10));
    }).replace(/\s+/g, " ").trim();
}

function validate(bundle, mode = "documents", now = Date.now()) {
  const { html, coverage, ledger, prd, guide } = bundle;
  const errors = [];
  const fail = (condition, message) => { if (condition) errors.push(message); };
  const unique = (items, label) => fail(new Set(items).size !== items.length, "duplicate " + label);
  const reqIds = [...prd.matchAll(/^### (FR-ARCH-\d{3}):/gm)].map((m) => m[1]);
  const acs = [...prd.matchAll(/^- \*\*(AC-ARCH-\d{3}-\d{2}):\*\* (.+)$/gm)];
  const acText = new Map(acs.map((m) => [m[1], m[2]]));
  const reqSet = new Set(reqIds);
  const points = [...html.matchAll(pointPattern)];
  const sourceIds = points.map((m) => m[1]);
  const sourceText = new Map(points.map((m) => [m[1], textOf(m[2])]));
  unique(reqIds, "requirement IDs"); unique(acs.map((m) => m[1]), "acceptance IDs");
  unique(sourceIds, "HTML point IDs"); unique(coverage.units.map((u) => u.id), "coverage IDs");
  unique(ledger.criteria.map((a) => a.id), "ledger criterion IDs");
  unique(ledger.requirements.map((r) => r.id), "ledger requirement IDs");
  fail(coverage.schemaVersion !== 1 || ledger.schemaVersion !== 1, "unsupported manifest schema");
  fail(sha(html) !== coverage.sourceSha256, "preserved HTML source hash changed");
  fail(sha(html.replace(pointPattern, "")) !== coverage.presentationRemainderSha256, "HTML presentation/remainder changed");
  fail(points.length !== coverage.semanticUnitCount || points.length !== coverage.units.length, "HTML point count mismatch");
  fail((html.match(/<!-- ARCH-POINT /g) ?? []).length !== points.length, "unpaired HTML point marker");
  fail((html.match(/<!-- \/ARCH-POINT /g) ?? []).length !== points.length, "unpaired HTML closing marker");
  for (const unit of coverage.units) {
    fail(!sourceText.has(unit.id), unit.id + ": missing source point");
    fail(sourceText.get(unit.id) !== unit.text || sha(unit.text) !== unit.textSha256, unit.id + ": source text/hash mismatch");
    fail(!["REQUIREMENT", "EVIDENCE", "REFERENCE"].includes(unit.disposition), unit.id + ": unknown disposition");
    fail(!unit.requirementIds?.length, unit.id + ": unmapped HTML point");
    for (const id of unit.requirementIds ?? []) fail(!reqSet.has(id), unit.id + ": unknown requirement " + id);
  }
  for (const id of sourceIds) fail(!coverage.units.some((u) => u.id === id), id + ": missing coverage row");
  for (const id of reqIds) {
    fail(!coverage.units.some((u) => u.requirementIds.includes(id)), id + ": no HTML trace");
    fail(!ledger.requirements.some((r) => r.id === id), id + ": no ledger requirement");
  }
  fail(ledger.requirementCount !== reqIds.length || ledger.requirements.length !== reqIds.length, "requirement count mismatch");
  fail(ledger.criterionCount !== acs.length || ledger.criteria.length !== acs.length, "acceptance count mismatch");
  fail(ledger.auditEvidenceIsNotImplementationEvidence !== true, "audit/implementation evidence separation missing");
  const programs = new Map(ledger.programs.map((p) => [p.id, p]));
  const children = new Map(ledger.children.map((c) => [c.id, c]));
  unique([...ledger.programs.map((p) => p.id)], "program IDs");
  unique([...ledger.children.map((c) => c.id)], "child IDs");
  const visiting = new Set(); const visited = new Set();
  function visit(id) {
    if (visiting.has(id)) { errors.push("program dependency cycle: " + id); return; }
    if (visited.has(id)) return;
    const program = programs.get(id);
    if (!program) { errors.push("unknown dependency: " + id); return; }
    visiting.add(id); for (const dep of program.dependsOn) visit(dep);
    visiting.delete(id); visited.add(id);
  }
  for (const p of ledger.programs) {
    visit(p.id); fail(p.dispatchable !== false, p.id + ": program cannot be dispatched as a code child");
    fail(!["NOT_STARTED", "PUBLISHED"].includes(p.readiness?.status), p.id + ": invalid readiness milestone");
    if (p.readiness?.status === "PUBLISHED") {
      fail(!present(p.readiness.artifact) || !present(p.readiness.revision), p.id + ": published readiness lacks artifact/revision");
      for (const dep of p.dependsOn) fail(programs.get(dep)?.readiness?.status !== "PUBLISHED", p.id + ": predecessor not published " + dep);
    }
    for (const id of p.requirements) fail(!reqSet.has(id), p.id + ": unknown requirement " + id);
  }
  const activeWrites = new Map();
  for (const child of ledger.children) {
    fail(!programs.has(child.program), child.id + ": unknown program");
    fail(!child.writeSet?.length, child.id + ": missing exact write set");
    fail(!child.testSet?.length && !present(child.testExemptionReason), child.id + ": no test set or reason");
    for (const path of [...(child.writeSet ?? []), ...(child.testSet ?? [])]) {
      fail(!present(path) || /[*?]/.test(path) || isAbsolute(path) || relative(root, resolve(root, path)).startsWith(".."), child.id + ": unsafe/non-exact path " + path);
      if (child.reservationStatus === "ACTIVE" && (child.writeSet ?? []).includes(path)) {
        fail(activeWrites.has(path), child.id + ": overlapping active write " + path);
        activeWrites.set(path, child.id);
      }
    }
    for (const id of child.acceptanceIds ?? []) fail(!acText.has(id), child.id + ": unknown acceptance " + id);
  }
  for (const requirement of ledger.requirements) {
    fail(!reqSet.has(requirement.id), requirement.id + ": absent from PRD");
    fail(!programs.has(requirement.program), requirement.id + ": unknown program");
    const assigned = ledger.programs.filter((p) => p.requirements.includes(requirement.id));
    fail(assigned.length !== 1 || assigned[0]?.id !== requirement.program, requirement.id + ": program assignment mismatch");
    const expected = acs.filter((m) => m[1].startsWith(requirement.id.replace("FR-", "AC-") + "-")).map((m) => m[1]);
    fail(JSON.stringify(requirement.criteria) !== JSON.stringify(expected), requirement.id + ": child acceptance set mismatch");
  }
  for (const ac of ledger.criteria) {
    const parent = ledger.requirements.find((r) => r.id === ac.requirementId);
    fail(ac.owner !== parent?.owner || ac.program !== parent?.program, ac.id + ": owner/program differs from parent");
    fail(!acText.has(ac.id) || acText.get(ac.id) !== ac.expected, ac.id + ": absent/changed acceptance text");
    fail(!reqSet.has(ac.requirementId) || !ac.id.startsWith(ac.requirementId.replace("FR-", "AC-") + "-"), ac.id + ": invalid parent");
    fail(!statuses.has(ac.status), ac.id + ": invalid status");
    fail(!programs.has(ac.program), ac.id + ": invalid program");
    fail(ac.applicability !== "REQUIRED", ac.id + ": applicability changed without governed waiver");
    fail(!ac.requiredEvidence?.length || ac.requiredEvidence.some((v) => !levels.has(v)), ac.id + ": invalid evidence levels");
    for (const level of ac.requiredEvidence ?? []) fail(!ac.evidencePlan.some((p) => p.level === level && present(p.id) && present(p.expected)), ac.id + ": missing evidence plan " + level);
    if (!["NOT_STARTED", "WAIVED"].includes(ac.status)) {
      const child = children.get(ac.childId);
      fail(!child || !child.acceptanceIds?.includes(ac.id), ac.id + ": advanced work lacks reserved child");
      fail(child?.program !== ac.program, ac.id + ": child program mismatch");
      if (["IMPLEMENTED_UNVERIFIED", "PASS"].includes(ac.status))
        for (const dep of programs.get(ac.program)?.dependsOn ?? [])
          fail(programs.get(dep)?.readiness?.status !== "PUBLISHED", ac.id + ": predecessor not published " + dep);
    }
    for (const evidence of ac.evidence) {
      fail(!levels.has(evidence.level) || !["PASS", "FAIL"].includes(evidence.status), ac.id + ": invalid actual evidence");
      for (const field of ["id", "revision", "environment", "dataset", "expected", "actual", "artifact", "reviewer", "timestamp"])
        fail(!present(evidence[field]), ac.id + ": evidence missing " + field);
      if (evidence.level !== "human") fail(!present(evidence.command) || !Number.isInteger(evidence.exitCode), ac.id + ": missing command/exit");
      if (evidence.status === "PASS" && evidence.level !== "human") fail(evidence.exitCode !== 0, ac.id + ": passing evidence has nonzero exit");
      fail(!Number.isFinite(Date.parse(evidence.timestamp)), ac.id + ": invalid evidence timestamp");
    }
    if (ac.status === "PASS") for (const level of ac.requiredEvidence)
      fail(!ac.evidence.some((e) => e.level === level && e.status === "PASS"), ac.id + ": PASS missing " + level);
    if (ac.status === "WAIVED") {
      for (const field of ["reason", "approvedBy", "approvalArtifact", "expiresAt", "compensatingControl"])
        fail(!present(ac.waiver?.[field]), ac.id + ": waiver missing " + field);
      fail(!(Date.parse(ac.waiver?.expiresAt) > now), ac.id + ": expired/invalid waiver");
      fail(!ac.waiver?.affectedIds?.includes(ac.id), ac.id + ": waiver scope missing");
    }
    if (mode === "implementation") fail(!["IMPLEMENTED_UNVERIFIED", "PASS", "WAIVED"].includes(ac.status), ac.id + ": implementation open (" + ac.status + ")");
    if (mode === "implementation" && ac.status === "IMPLEMENTED_UNVERIFIED")
      for (const level of ac.requiredEvidence.filter((v) => ["source", "unit", "contract"].includes(v)))
        fail(!ac.evidence.some((e) => e.level === level && e.status === "PASS"), ac.id + ": implementation missing local proof " + level);
    if (mode === "release") fail(!["PASS", "WAIVED"].includes(ac.status), ac.id + ": release evidence open (" + ac.status + ")");
  }
  for (const id of acText.keys()) fail(!ledger.criteria.some((a) => a.id === id), id + ": missing ledger row");
  for (const file of ["16-architecture-hardening-prd.md", "architecture-review/2026-10-24-architecture-review.html", "architecture-review/html-prd-coverage.json", "architecture-review/execution-ledger.json"])
    fail(!guide.includes(file), "Claude guide missing source pointer " + file);
  return errors;
}

function selfTest(bundle) {
  const tests = [
    ["valid document coverage", () => {}, false, "documents"],
    ["HTML changed", (b) => { b.html += "<p>unmapped new point</p>"; }],
    ["coverage row omitted", (b) => { b.coverage.units.pop(); }],
    ["point loses requirement", (b) => { b.coverage.units[0].requirementIds = []; }],
    ["unknown requirement", (b) => { b.coverage.units[0].requirementIds = ["FR-ARCH-999"]; }],
    ["duplicate coverage ID", (b) => { b.coverage.units[1].id = b.coverage.units[0].id; }],
    ["criterion omitted", (b) => { b.ledger.criteria.pop(); }],
    ["acceptance text drift", (b) => { b.ledger.criteria[0].expected = "weaker"; }],
    ["criterion owner drift", (b) => { b.ledger.criteria[0].owner = "wrong-owner.md"; }],
    ["requirement assigned twice", (b) => { b.ledger.programs[1].requirements.push(b.ledger.programs[0].requirements[0]); }],
    ["missing evidence plan", (b) => { b.ledger.criteria[0].evidencePlan = []; }],
    ["PASS without evidence", (b) => { b.ledger.criteria[0].status = "PASS"; }],
    ["dependency cycle", (b) => { b.ledger.programs[0].dependsOn = [b.ledger.programs[1].id]; }],
    ["whole program dispatch", (b) => { b.ledger.programs[0].dispatchable = true; }],
    ["expired waiver", (b) => { b.ledger.criteria[0].status = "WAIVED"; b.ledger.criteria[0].waiver = { expiresAt: "2000-01-01" }; }],
    ["implementation stays open", () => {}, true, "implementation"],
    ["release stays open", () => {}, true, "release"],
  ];
  for (const [label, mutate, expectedFailure = true, mode = "documents"] of tests) {
    const copy = structuredClone(bundle); mutate(copy);
    const errors = validate(copy, mode);
    if ((errors.length > 0) !== expectedFailure) throw new Error("self-test failed: " + label + ": " + errors.join("; "));
    process.stdout.write("PASS self-test: " + label + "\n");
  }
  process.stdout.write(tests.length + " architecture coverage self-tests passed\n");
}

const read = (name) => readFileSync(resolve(suite, name), "utf8");
const bundle = {
  html: read("architecture-review/2026-10-24-architecture-review.html"),
  coverage: JSON.parse(read("architecture-review/html-prd-coverage.json")),
  ledger: JSON.parse(read("architecture-review/execution-ledger.json")),
  prd: read("16-architecture-hardening-prd.md"), guide: read("17-claude-architecture-execution.md"),
};
if (process.argv.includes("--self-test")) selfTest(bundle);
else {
  const mode = process.argv.includes("--release") ? "release" : process.argv.includes("--implementation") ? "implementation" : "documents";
  const errors = validate(bundle, mode);
  for (const ac of bundle.ledger.criteria) for (const evidence of ac.evidence) {
    for (const [name, expected] of Object.entries(evidence.sourceHashes ?? {})) {
      const target = resolve(root, name);
      if (relative(root, target).startsWith("..") || !existsSync(target) || sha(readFileSync(target)) !== expected)
        errors.push(ac.id + ": stale/missing evidence source " + name);
    }
  }
  if (errors.length) {
    process.stderr.write("FAIL architecture coverage (" + mode + "): " + errors.length + " finding(s)\n" + errors.slice(0, 12).join("\n") + "\n");
    if (errors.length > 12) process.stderr.write("... " + (errors.length - 12) + " further finding(s)\n");
    process.exitCode = 1;
  } else process.stdout.write("PASS architecture coverage (" + mode + "): " + bundle.coverage.semanticUnitCount + " HTML points, " + bundle.ledger.requirementCount + " requirements, " + bundle.ledger.criterionCount + " acceptance criteria\n");
}
