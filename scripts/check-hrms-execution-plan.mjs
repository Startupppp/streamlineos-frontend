import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const specDirectory = "docs/specs/hrms-module";
const read = (path) => readFileSync(join(root, path), "utf8");

const requireText = (content, expected, location, failures) => {
  if (!content.includes(expected))
    failures.push(`${location} is missing ${JSON.stringify(expected)}`);
};

const walk = (directory, predicate) => {
  const results = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) results.push(...walk(path, predicate));
    else if (predicate(path)) results.push(path);
  }
  return results;
};

const validate = () => {
  const failures = [];
  const required = [
    "README.md",
    "product-blueprint-prd.md",
    "work-packets.md",
    "agent-runbook.md",
    "context-capsules.md",
    "parallel-agent-guide.md",
    "requirement-map.md",
  ].map((name) => `${specDirectory}/${name}`);

  for (const path of required) {
    if (!existsSync(join(root, path))) failures.push(`missing required file ${path}`);
  }
  if (failures.length) return failures;

  const ledger = read(`${specDirectory}/README.md`);
  for (const status of [
    "`BLOCKED`", "`READY`", "`RESERVED`", "`CODE_COMPLETE`",
    "`INTEGRATED`", "`EVIDENCE_PENDING`", "`DONE`",
  ]) requireText(ledger, status, `${specDirectory}/README.md`, failures);
  for (const phrase of [
    "There is no global census or Wave 0 barrier",
    "one coordinator plus two code agents",
    "347 open checkboxes",
    "162 authenticated",
    "169 HR/Directory/Payroll controllers",
    "96 schema files",
  ]) requireText(ledger, phrase, `${specDirectory}/README.md`, failures);

  const packetCatalog = read(`${specDirectory}/work-packets.md`);
  for (const packet of [
    "HRM-X-CENSUS-ROUTES-001", "HRM-X-CENSUS-FORMS-001",
    "HRM-X-CENSUS-API-001", "HRM-X-CENSUS-SCHEMA-001",
    "HRM-X-CENSUS-NAV-001", "HRM-X-SEAM-ROUTE-001",
    "HRM-X-SEAM-PERM-001", "HRM-X-SEAM-CONTRACT-001",
    "HRM-X-SEAM-QUERY-001", "HRM-X-SEAM-UI-001",
    "HRM-X-SEAM-DB-001", "HRM-X-SEAM-EVENT-001", "HRM-X-REL-001",
  ]) requireText(packetCatalog, packet, `${specDirectory}/work-packets.md`, failures);

  const requirementMap = read(`${specDirectory}/requirement-map.md`);
  const acceptanceFiles = readdirSync(join(root, specDirectory))
    .filter((name) => /^\d.*\.md$/.test(name));
  let openAcceptanceItems = 0;
  for (const name of acceptanceFiles) {
    const path = `${specDirectory}/${name}`;
    const content = read(path);
    openAcceptanceItems += (content.match(/^\s*- \[ \]/gm) ?? []).length;
    requireText(
      content,
      "Acceptance reference only. Dispatch and status live in",
      path,
      failures,
    );
    requireText(requirementMap, `\`${name}\``, `${specDirectory}/requirement-map.md`, failures);
  }
  if (openAcceptanceItems !== 347)
    failures.push(`acceptance baseline drift: expected 347 open items, found ${openAcceptanceItems}`);

  const routeRoots = ["hr", "directory", "me", "payroll"].map((name) =>
    join(root, "frontend/app/(authenticated)", name),
  );
  const authenticatedPages = routeRoots.reduce(
    (sum, directory) => sum + walk(directory, (path) => path.endsWith("page.tsx")).length,
    0,
  );
  if (authenticatedPages !== 162)
    failures.push(`route baseline drift: expected 162 authenticated HRMS-accounted pages, found ${authenticatedPages}`);
  if (!existsSync(join(root, "frontend/app/employee-onboarding/page.tsx")))
    failures.push("missing accounted /employee-onboarding page gate");

  const controllerRoots = ["hr", "directory", "payroll"].map((name) =>
    join(root, "backend/src/modules", name),
  );
  const controllers = controllerRoots.reduce(
    (sum, directory) => sum + walk(directory, (path) => path.endsWith(".controller.ts")).length,
    0,
  );
  if (controllers !== 169)
    failures.push(`controller baseline drift: expected 169, found ${controllers}`);

  const schemaRoots = ["hr", "directory", "payroll"].map((name) =>
    join(root, "backend/src/db/schema", name),
  );
  const schemaFiles = schemaRoots.reduce(
    (sum, directory) => sum + walk(directory, () => true).length,
    0,
  );
  if (schemaFiles !== 96)
    failures.push(`schema baseline drift: expected 96 files, found ${schemaFiles}`);

  const blueprint = read(`${specDirectory}/product-blueprint-prd.md`);
  for (const contract of [
    "Information Architecture and Sidebar",
    "Search, Filters, Views, and Pagination",
    "Cards, Rows, and Bulk Actions",
    "Forms and Validation",
    "Data, API, Cache, and Architecture",
    "Privacy, Security, Compliance, and Global Scale",
    "Visual System",
    "Competitive Direction",
  ]) requireText(blueprint, contract, `${specDirectory}/product-blueprint-prd.md`, failures);

  return failures;
};

const runSelfTest = () => {
  const failures = [];
  requireText("READY but incomplete", "HRM-X-REL-001", "fixture", failures);
  if (failures.length !== 1 || !failures[0].includes("fixture"))
    throw new Error("HRMS execution-plan self-test did not detect a missing contract");
  process.stdout.write("HRMS execution plan self-test passed\n");
};

if (process.argv.includes("--self-test")) runSelfTest();
else {
  const failures = validate();
  if (failures.length) {
    process.stderr.write(`${failures.join("\n")}\n`);
    process.exitCode = 1;
  } else process.stdout.write("HRMS execution plan check passed\n");
}
