#!/usr/bin/env node
import assert from "node:assert/strict";
import { validateBacklog } from "./check-prd-traceability.mjs";

const legacyText = "- [ ] **[PRD-C001]** Example criterion";
const indexText = "sole source of current pending work\n[Lane](lane.md)";
const validLane = `# Lane

## TEST-001 — Prove the gate
Status: READY
Maps to: PRD-C001
Parallel group: 1
Depends on: none
Owner: test agent
`;
const run = (overrides = {}) => validateBacklog({ indexText, laneFiles: { "lane.md": validLane }, legacyText, minTasks: 1, ...overrides });

assert.deepEqual(run().failures, []);
assert(run({ laneFiles: { "lane.md": validLane.replace("Status: READY", "Status: DONE") } }).failures.some((x) => x.includes("BAD STATUS")));
assert(run({ laneFiles: { "lane.md": validLane.replace("PRD-C001", "PRD-C999") } }).failures.some((x) => x.includes("UNKNOWN CRITERION")));
assert(run({ laneFiles: { "lane.md": validLane.replace("Depends on: none", "Depends on: TEST-999") } }).failures.some((x) => x.includes("UNKNOWN DEPENDENCY")));
assert(run({ indexText: "sole source of current pending work" }).failures.some((x) => x.includes("UNINDEXED LANE")));
assert(run({ laneFiles: {} }).failures.some((x) => x.includes("MISSING LANE")));
console.log("PASS: PRD traceability self-test bites on status, mapping, dependency, and index drift.");
