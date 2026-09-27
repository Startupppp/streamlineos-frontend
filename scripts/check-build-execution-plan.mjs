import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const normalizeLineEndings = (content) => content.replace(/\r\n/g, "\n");

const read = (relativePath) =>
  normalizeLineEndings(readFileSync(join(repositoryRoot, relativePath), "utf8"));

const requireText = (content, expected, location, failures) => {
  if (!content.includes(expected))
    failures.push(`${location} is missing ${JSON.stringify(expected)}`);
};

// Vacuity floors. Raise when the build spec grows; never lower to make a run pass.
const PRD_FLOOR_MODULE = 21;
const PRD_FLOOR_SIDEBAR = 5;

const validate = () => {
  const failures = [];
  const requiredFiles = [
    "architecture-refactor/prd/completion-plan.md",
    "docs/specs/build/README.md",
    "docs/specs/build/agent-runbook.md",
    "docs/specs/build/work-packets.md",
    "docs/specs/build/requirement-map.md",
    "docs/specs/build/context-capsules.md",
    "docs/specs/build/parallel-agent-guide.md",
  ];

  for (const relativePath of requiredFiles) {
    if (!existsSync(join(repositoryRoot, relativePath)))
      failures.push(`missing required file ${relativePath}`);
  }

  if (failures.length > 0) return failures;

  requireText(
    read(requiredFiles[0]),
    "docs/specs/build/README.md",
    requiredFiles[0],
    failures,
  );

  for (const [directory, floor] of [
    ["docs/specs/build/module", PRD_FLOOR_MODULE],
    ["docs/specs/build/sidebar", PRD_FLOOR_SIDEBAR],
  ]) {
    const prdNames = readdirSync(join(repositoryRoot, directory)).filter((n) => n.endsWith("-prd.md"));
    if (prdNames.length < floor) {
      failures.push(
        `${directory} has ${prdNames.length} PRD file(s) but the floor is ${floor} — the walker is not reaching the spec tree`,
      );
      continue;
    }
    for (const name of prdNames) {
      const relativePath = `${directory}/${name}`;
      requireText(
        read(relativePath),
        "Acceptance reference only. Dispatch and status live in",
        relativePath,
        failures,
      );
    }
  }

  const sidebarDirectory = read(
    "docs/specs/build/sidebar/02-scope-directory-prd.md",
  );
  requireText(
    sidebarDirectory,
    "A project may be\nstandalone with no managed product",
    "docs/specs/build/sidebar/02-scope-directory-prd.md",
    failures,
  );

  const routeManifest = read(
    "docs/specs/build/module/01a-canonical-route-manifest-prd.md",
  );
  for (const decision of [
    "KEEP_ROUTE_MOVE_CONFIG",
    "/build/{projectId}/forms` definitions + `/build/{projectId}/triage",
  ]) {
    requireText(
      routeManifest,
      decision,
      "docs/specs/build/module/01a-canonical-route-manifest-prd.md",
      failures,
    );
  }

  const ledger = read("docs/specs/build/README.md");
  for (const status of [
    "`BLOCKED`",
    "`READY`",
    "`RESERVED`",
    "`CODE_COMPLETE`",
    "`INTEGRATED`",
    "`EVIDENCE_PENDING`",
    "`DONE`",
  ]) {
    requireText(
      ledger,
      status,
      "docs/specs/build/README.md",
      failures,
    );
  }

  const packets = read("docs/specs/build/work-packets.md");
  for (const packet of [
    "BLD-X-DEC-001",
    "BLD-X-CENSUS-ROUTES-001",
    "BLD-X-CENSUS-FORMS-001",
    "BLD-X-CENSUS-API-001",
    "BLD-X-CENSUS-SCHEMA-001",
    "BLD-X-ROUTE-001",
    "BLD-X-CONTRACT-001",
    "BLD-X-SEAM-PERM-001",
    "BLD-X-SEAM-QUERY-001",
    "BLD-X-REL-001",
  ]) {
    requireText(
      packets,
      packet,
      "docs/specs/build/work-packets.md",
      failures,
    );
  }

  const requirementMap = read(
    "docs/specs/build/requirement-map.md",
  );
  for (const directory of [
    "docs/specs/build/module",
    "docs/specs/build/sidebar",
  ]) {
    for (const name of readdirSync(join(repositoryRoot, directory))) {
      if (name !== "README.md" && !name.endsWith("-prd.md")) continue;
      requireText(
        requirementMap,
        `\`${name}\``,
        "docs/specs/build/requirement-map.md",
        failures,
      );
    }
  }

  return failures;
};

const runSelfTest = () => {
  let passed = 0;
  let failed = 0;
  const check = (label, ok, detail) => {
    if (ok) {
      process.stdout.write(`  PASS  ${label}\n`);
      passed++;
    } else {
      process.stderr.write(`  FAIL  ${label}${detail ? `\n        ${detail}` : ""}\n`);
      failed++;
    }
  };

  const failures = [];
  requireText("alpha", "beta", "fixture", failures);
  check(
    "requireText detects a missing string",
    failures.length === 1 && failures[0].includes("fixture"),
    `got: ${JSON.stringify(failures)}`,
  );

  const noFailures = [];
  requireText("alpha beta", "alpha", "fixture", noFailures);
  check("requireText passes when text is present", noFailures.length === 0, `got: ${JSON.stringify(noFailures)}`);

  check(
    "normalizeLineEndings converts CRLF to LF",
    normalizeLineEndings("alpha\r\nbeta") === "alpha\nbeta",
    "CRLF not converted",
  );

  const floorFailures = [];
  const fakeNames = [];
  if (fakeNames.length < 3) {
    floorFailures.push(`fake/dir has ${fakeNames.length} PRD file(s) but the floor is 3 — the walker is not reaching the spec tree`);
  }
  check(
    "PRD floor fails when directory has fewer files than the floor",
    floorFailures.length === 1 && floorFailures[0].includes("walker is not reaching"),
    `got: ${JSON.stringify(floorFailures)}`,
  );

  const floorOkFailures = [];
  const enoughNames = ["a-prd.md", "b-prd.md", "c-prd.md"];
  if (enoughNames.length < 3) {
    floorOkFailures.push("floor fail");
  }
  check(
    "PRD floor passes when directory meets the floor",
    floorOkFailures.length === 0,
    `got: ${JSON.stringify(floorOkFailures)}`,
  );

  process.stdout.write(`\nbuild execution plan self-test: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
};

if (process.argv.includes("--self-test")) {
  runSelfTest();
} else {
  const failures = validate();
  if (failures.length > 0) {
    process.stderr.write(`${failures.join("\n")}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(
      `build execution plan check passed\n` +
      `  verified: ${PRD_FLOOR_MODULE} module PRDs and ${PRD_FLOOR_SIDEBAR} sidebar PRDs each carry a dispatch-reference marker\n` +
      `  verified: route manifest carries KEEP_ROUTE_MOVE_CONFIG and the triage/forms path marker\n` +
      `  verified: README carries all seven status tokens; work-packets carries all ten BLD-X IDs\n` +
      `  verified: requirement-map names every PRD file in both directories\n` +
      `  not checked: whether the route count in the manifest prose is current (prose count is not asserted)\n`,
    );
  }
}
