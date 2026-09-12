#!/usr/bin/env node
import assert from "node:assert/strict";
import { validateBacklog } from "./check-prd-traceability.mjs";
const legacyText = "- [ ] **[PRD-C001]** Criterion\n- [ ] **[PRD-C002]** Another criterion";
const planText = "# Remaining work\nThe only execution checklist.\n\n# S1 — Identity\nOwner: S1\nMaps to: PRD-C001, PRD-C002\n\n## ID-001 — Recovery\n- [ ] Prove revoked sessions cannot refresh.\n";
const run = (overrides = {}) => validateBacklog({ planText, prdFiles: ["completion-plan.md"], legacyText, minTasks: 1, ...overrides });
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
assert.deepEqual(run({ prdFiles: ["completion-plan.md", "evidence.json"] }).failures, []);
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
rejects("README competes", { prdFiles: ["completion-plan.md", "README.md"] }, "COMPETING PRD");
rejects("uppercase competitor", { prdFiles: ["completion-plan.md", "lane.MD"] }, "COMPETING PRD");
rejects("missing plan", { prdFiles: [] }, "MISSING PLAN");
rejects("empty registry", { legacyText: "<!-- PRD-C001 -->" }, "EMPTY REGISTRY");
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
console.log("PASS: single-plan traceability self-test; " + cases + " negative cases plus shared-owner, numbered/completed and task-identity positive cases.");
