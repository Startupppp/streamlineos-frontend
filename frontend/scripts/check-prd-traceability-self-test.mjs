#!/usr/bin/env node
import assert from "node:assert/strict";
import { REQUIRED_EVIDENCE_MD, validateBacklog } from "./check-prd-traceability.mjs";
const registry = "# Criterion registry\n\n- **PRD-C001** — Criterion description\n- **PRD-C002** — Another criterion description\n\n";
const planText = registry + "# Remaining work\nThe only execution checklist.\n\n# S1 — Identity\nOwner: S1\nMaps to: PRD-C001, PRD-C002\n\n## ID-001 — Recovery\n- [ ] Prove revoked sessions cannot refresh.\n";
const run = (overrides = {}) => validateBacklog({ planText, prdFiles: ["prd/completion-plan.md"], minTasks: 1, ...overrides });
let cases = 0;
function rejects(label, overrides, expected) {
  assert(run(overrides).failures.some(failure => failure.includes(expected)), label);
  cases++;
}
assert.deepEqual(run().failures, []);
assert.equal(run().tasks[0].context, "ID-001 — Recovery");
assert.equal(run().tasks[0].completed, false);
assert.deepEqual(run({ planText: planText.replaceAll("S1", "S4/S5") }).failures, []);
assert.deepEqual(run({ planText: planText.replace("- [ ]", "1. [X]") }).failures, []);
assert.deepEqual(run({ prdFiles: ["prd/completion-plan.md", "evidence.json"] }).failures, []);
assert.deepEqual(run({ prdFiles: ["prd/completion-plan.md", ...REQUIRED_EVIDENCE_MD] }).failures, []);
rejects("old format is not coverage", { planText: "sole source of current pending work\n## TEST-001 — Old\nStatus: READY\nOwner: test" }, "VACUOUS BACKLOG");
rejects("missing authority", { planText: planText.replace("The only execution checklist.", "A checklist.") }, "PLAN AUTHORITY");
rejects("commented authority", { planText: planText.replace("The only execution checklist.", "<!-- The only execution checklist. -->") }, "PLAN AUTHORITY");
rejects("unknown criterion", { planText: planText.replace("PRD-C001", "PRD-C999") }, "UNKNOWN CRITERION");
rejects("malformed mapping", { planText: planText.replace("PRD-C001, PRD-C002", "PRD-C0010") }, "UNMAPPED SECTION");
rejects("missing mapping", { planText: planText.replace("Maps to: PRD-C001, PRD-C002", "") }, "UNMAPPED SECTION");
rejects("missing owner", { planText: planText.replace("Owner: S1", "") }, "BAD OWNER");
rejects("wrong owner", { planText: planText.replace("Owner: S1", "Owner: S2") }, "BAD OWNER");
rejects("duplicate metadata", { planText: planText.replace("Owner: S1", "Owner: S1\nOwner: S1") }, "DUPLICATE METADATA");
rejects("child metadata cannot supply ownership", { planText: planText.replace("Owner: S1\n", "").replace("## ID-001 — Recovery", "## ID-001 — Recovery\nOwner: S1") }, "BAD OWNER");
rejects("README competes", { prdFiles: ["prd/completion-plan.md", "README.md"] }, "COMPETING PRD");
rejects("uppercase competitor", { prdFiles: ["prd/completion-plan.md", "lane.MD"] }, "COMPETING PRD");
rejects("missing plan", { prdFiles: [] }, "MISSING PLAN");
rejects("empty registry", { planText: planText.replace(registry, "<!-- PRD-C001 -->\n") }, "EMPTY REGISTRY");
rejects("empty backlog", { planText: "The only execution checklist." }, "VACUOUS BACKLOG");
rejects("section without tasks", { planText: planText.replace(/- \[ \].*/, "") }, "EMPTY SECTION");
rejects("unowned checkbox", { planText: planText + "\n# Other work\n- [ ] Prove another acceptance condition." }, "ORPHAN TASK");
rejects("unnamed checkbox", { planText: planText.replace("Prove revoked sessions cannot refresh.", "") }, "UNNAMED TASK");
rejects("duplicate task", { planText: planText + "- [ ] Prove revoked sessions cannot refresh.\n" }, "DUPLICATE TASK");
rejects("duplicate section", { planText: planText + "\n" + planText.slice(planText.indexOf("# S1")) }, "DUPLICATE SECTION");
for (const [label, replacement] of [
  ["backtick fence", "```md\n- [ ] Prove revoked sessions cannot refresh.\n```"],
  ["tilde fence", "~~~~md\n- [ ] Prove revoked sessions cannot refresh.\n~~~~"],
  ["comment", "<!--\n- [ ] Prove revoked sessions cannot refresh.\n-->"],
]) rejects(label + " cannot supply coverage", { planText: planText.replace("- [ ] Prove revoked sessions cannot refresh.", replacement) }, "VACUOUS BACKLOG");
rejects("minimum coverage floor", { minTasks: 2 }, "VACUOUS BACKLOG");
rejects("zero floor prohibited", { minTasks: 0 }, "BAD MINIMUM");
rejects("nested competitor", { prdFiles: ["prd/completion-plan.md", "final-refactor/evidence/session.MD"] }, "COMPETING PRD");
rejects("new report beside required evidence", { prdFiles: ["prd/completion-plan.md", "final-refactor/evidence/bootstrap-head-637/new-report.md"] }, "COMPETING PRD");
rejects("required evidence typo", { prdFiles: ["prd/completion-plan.md", "final-refactor/evidence/bootstrap-head-637/READM.md"] }, "COMPETING PRD");
rejects("required evidence wrong directory", { prdFiles: ["prd/completion-plan.md", "final-refactor/evidence/bootstrap-head-999/README.md"] }, "COMPETING PRD");
rejects("root competitor", { prdFiles: ["prd/completion-plan.md", "AGENTS.md"] }, "COMPETING PRD");
rejects("mapping cannot define registry", { planText: planText.replace(registry, "") }, "EMPTY REGISTRY");
rejects("registry rows need descriptions", { planText: planText.replace("— Criterion description", "— ") }, "MALFORMED CRITERION");
rejects("duplicate criterion", { planText: planText.replace("- **PRD-C002**", "- **PRD-C001**") }, "DUPLICATE CRITERION");
rejects("duplicate registry", { planText: registry + planText }, "DUPLICATE REGISTRY");
rejects("registry heading required", { planText: planText.replace("# Criterion registry", "# A mapping example") }, "EMPTY REGISTRY");
rejects("fenced registry ignored", { planText: planText.replace(registry, "\x60\x60\x60md\n" + registry + "\x60\x60\x60\n") }, "EMPTY REGISTRY");
console.log("PASS: single-plan traceability self-test; " + cases + " negative cases plus shared-owner, numbered/completed and task-identity positive cases.");
