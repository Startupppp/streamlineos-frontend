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

  for (const directory of [
    "docs/specs/build/module",
    "docs/specs/build/sidebar",
  ]) {
    for (const name of readdirSync(join(repositoryRoot, directory))) {
      if (!name.endsWith("-prd.md")) continue;
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
    "all 74 current Build-owned routes",
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
  const failures = [];
  requireText("alpha", "beta", "fixture", failures);
  if (failures.length !== 1 || !failures[0].includes("fixture"))
    throw new Error("build execution plan self-test failed");
  if (normalizeLineEndings("alpha\r\nbeta") !== "alpha\nbeta")
    throw new Error("build execution plan line-ending self-test failed");
  process.stdout.write("build execution plan self-test passed\n");
};

if (process.argv.includes("--self-test")) {
  runSelfTest();
} else {
  const failures = validate();
  if (failures.length > 0) {
    process.stderr.write(`${failures.join("\n")}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write("build execution plan check passed\n");
  }
}
