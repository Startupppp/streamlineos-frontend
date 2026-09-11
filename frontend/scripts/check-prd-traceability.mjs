#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.PRD_TRACEABILITY_ROOT ? resolve(process.env.PRD_TRACEABILITY_ROOT) : resolve(HERE, "..", "..");
const PRD_DIR = join(ROOT, "architecture-refactor", "prd");
const INDEX = join(PRD_DIR, "README.md");
const CRITERIA = join(ROOT, "architecture-refactor", "PRD-10-10-CODE-RELEASE-TODO.md");
const VALID_STATUSES = new Set(["READY", "BLOCKED-EXTERNAL", "FINAL-INTEGRATION"]);
const TASK = /^## ([A-Z]+-\d{3}) — (.+)$/;
const REQUIRED = ["Status", "Maps to", "Parallel group", "Depends on", "Owner"];

export function validateBacklog({ indexText, laneFiles, legacyText, minTasks = 10 }) {
  const failures = [];
  const knownCriteria = new Set(legacyText.match(/PRD-C\d{3}/g) ?? []);
  const indexed = new Set([...indexText.matchAll(/\]\(([^/)]+\.md)\)/g)].map((m) => m[1]));
  const actual = new Set(Object.keys(laneFiles));
  if (!indexText.includes("sole source of current pending work")) failures.push("INDEX AUTHORITY: README must declare the sole active backlog.");
  for (const file of indexed) if (!actual.has(file)) failures.push(`MISSING LANE: ${file} is linked but absent.`);
  for (const file of actual) if (!indexed.has(file)) failures.push(`UNINDEXED LANE: ${file} is not routed by README.md.`);

  const tasks = new Map();
  for (const [file, source] of Object.entries(laneFiles)) {
    const lines = source.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const match = TASK.exec(lines[i]);
      if (!match) continue;
      const [, id, title] = match;
      if (tasks.has(id)) failures.push(`DUPLICATE TASK: ${id} appears in ${tasks.get(id).file} and ${file}.`);
      const metadata = {};
      for (let j = i + 1; j < lines.length && !lines[j].startsWith("## "); j++) {
        const field = /^(Status|Maps to|Parallel group|Depends on|Owner): (.+)$/.exec(lines[j]);
        if (field) metadata[field[1]] = field[2].trim();
      }
      for (const field of REQUIRED) if (!metadata[field]) failures.push(`MISSING METADATA: ${id} lacks ${field}.`);
      if (metadata.Status && !VALID_STATUSES.has(metadata.Status)) failures.push(`BAD STATUS: ${id} uses ${metadata.Status}.`);
      const mappings = metadata["Maps to"]?.match(/PRD-C\d{3}/g) ?? [];
      if (mappings.length === 0) failures.push(`UNMAPPED TASK: ${id} has no PRD criterion.`);
      for (const criterion of mappings) if (!knownCriteria.has(criterion)) failures.push(`UNKNOWN CRITERION: ${id} maps to ${criterion}.`);
      tasks.set(id, { file, title, metadata });
    }
  }
  if (tasks.size < minTasks) failures.push(`VACUOUS BACKLOG: found ${tasks.size} tasks; expected at least ${minTasks}.`);
  for (const [id, task] of tasks) {
    const deps = task.metadata["Depends on"] === "none" ? [] : task.metadata["Depends on"]?.match(/[A-Z]+-\d{3}/g) ?? [];
    for (const dep of deps) {
      if (dep === id) failures.push(`SELF DEPENDENCY: ${id}.`);
      else if (!tasks.has(dep)) failures.push(`UNKNOWN DEPENDENCY: ${id} depends on ${dep}.`);
    }
  }
  return { failures, taskCount: tasks.size, laneCount: actual.size };
}

function main() {
  if (!existsSync(INDEX) || !existsSync(CRITERIA)) {
    console.error("FAIL: active PRD index or criterion registry is missing.");
    process.exit(1);
  }
  const laneFiles = Object.fromEntries(readdirSync(PRD_DIR).filter((name) => name.endsWith(".md") && name !== "README.md").map((name) => [name, readFileSync(join(PRD_DIR, name), "utf8")]));
  const result = validateBacklog({ indexText: readFileSync(INDEX, "utf8"), laneFiles, legacyText: readFileSync(CRITERIA, "utf8") });
  if (result.failures.length) {
    for (const failure of result.failures) console.error(`FAIL: ${failure}`);
    process.exit(1);
  }
  console.log(`PASS: ${result.taskCount} active tasks across ${result.laneCount} indexed module lanes.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
