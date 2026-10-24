import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const suite = join(root, "docs/specs/hrms-payroll-reform");
const formerSuite = join(root, "docs/specs/hrms-module");

const required = [
  "README.md",
  "00-suite-product-prd.md",
  "00a-suite-domain-contracts-prd.md",
  "00b-lifecycle-transition-contracts-prd.md",
  "00c-requirement-tier-traceability-prd.md",
  "01-core-hr-lifecycle-prd.md",
  "02-workforce-management-prd.md",
  "03-talent-experience-rewards-prd.md",
  "04-employee-manager-service-prd.md",
  "05-india-payroll-prd.md",
  "05a-india-payroll-statutory-prd.md",
  "05b-india-payroll-controls-edge-cases-prd.md",
  "05c-payroll-statutory-transition-tables-prd.md",
  "06-platform-intelligence-compliance-prd.md",
  "06a-operations-release-evidence-prd.md",
  "07-pages-navigation-roles-prd.md",
  "07a-page-permission-manifest-prd.md",
  "07b-experience-content-quality-prd.md",
  "07c-critical-journeys-edge-cases-prd.md",
  "08-competitive-coverage-release-prd.md",
  "08a-competitor-benchmark-prd.md",
  "09-implementation-migration-cockpit-prd.md",
  "10-current-product-gaps-prd.md",
  "11-reporting-manager-prd.md",
  "2026-10-22-market-benchmark.md",
  "16-architecture-hardening-prd.md",
  "17-claude-architecture-execution.md",
];

// These moved files had unfinished checkboxes at consolidation time. A file may
// leave this list only after its remaining work is completed with evidence.
const protectedOpenFiles = [
  "00-product-decisions-prd.md", "01-route-navigation-prd.md",
  "02-page-inventory-prd.md", "03-sidebar-ia-prd.md",
  "04-discovery-filters-views-prd.md", "05-cards-bulk-actions-prd.md",
  "06-forms-validation-prd.md", "07-data-performance-prd.md",
  "08-architecture-prd.md", "09-visual-hierarchy-prd.md",
  "10-competitor-parity-prd.md", "11-release-verification-prd.md",
  "12-payroll-prd.md", "13-wfh-wfo-prd.md",
  "14-page-catalog-readme.md", "14a-catalog-core-people.md",
  "14b-catalog-time-leave.md", "14c-catalog-experience.md",
  "14d-catalog-ops-governance.md", "14e-catalog-hr-settings.md",
  "14f-catalog-payroll.md", "14g-catalog-recruitment-boundary.md",
  "15-recheck-gap-matrix.md", "15-reporting-manager-onboarding-prd.md",
  "agent-runbook.md", "work-packets.md",
];

// The tier register uses compact ranges (for example FR-CORE-001–006,
// 008–009). Expand its table rows before checking individual owner IDs.
const registeredRequirementIds = (register) => {
  const ids = new Set();
  for (const row of register.split(/\r?\n/)) {
    if (!/^\|\s*\d{2}[a-z]?\s/.test(row)) continue;
    const family = row.match(/FR-([A-Z]+)-\d{3}/)?.[1];
    if (!family) continue;
    for (const [, first, last] of row.matchAll(/(?<!\d)(\d{3})(?:[–-](\d{3}))?(?!\d)/g)) {
      const start = Number(first);
      const end = Number(last ?? first);
      for (let number = start; number <= end; number++)
        ids.add(`FR-${family}-${String(number).padStart(3, "0")}`);
    }
  }
  return ids;
};

const validate = ({ directory = suite, retiredDirectory = formerSuite } = {}) => {
  const failures = [];
  if (existsSync(retiredDirectory)) failures.push("former HRMS specification folder still exists");
  if (!existsSync(directory)) return [...failures, "merged People + Payroll folder is missing"];

  const files = readdirSync(directory).filter((name) => extname(name) === ".md");
  for (const name of [...required, ...protectedOpenFiles]) {
    if (!files.includes(name)) failures.push(`missing merged document: ${name}`);
  }
  const allText = files.map((name) => [name, readFileSync(join(directory, name), "utf8")]);
  const seenBodies = new Map();
  const seenOpenItems = new Map();
  for (const [name, content] of allText) {
    const duplicateBody = seenBodies.get(content);
    if (duplicateBody) failures.push(`${name}: duplicates the content of ${duplicateBody}`);
    else seenBodies.set(content, name);
    for (const match of content.matchAll(/^\s*- \[ \] (.+)$/gm)) {
      const item = match[1].trim().replace(/\s+/g, " ").toLowerCase();
      const duplicateItem = seenOpenItems.get(item);
      if (duplicateItem) failures.push(`${name}: repeats an open item in ${duplicateItem}`);
      else seenOpenItems.set(item, name);
    }
    if (content.includes("docs/specs/hrms-module") || content.includes("../hrms-module/"))
      failures.push(`${name}: stale former-folder reference`);
    for (const match of content.matchAll(/\]\((\.[^\s)]+\.md)(?:#[^)]+)?\)/g)) {
      const target = resolve(directory, match[1]);
      if (!existsSync(target)) failures.push(`${name}: broken local link ${match[1]}`);
    }
  }
  const readme = allText.find(([name]) => name === "README.md")?.[1] ?? "";
  for (const name of required.filter((name) => name !== "README.md")) {
    if (!readme.includes(name)) failures.push(`README.md: missing document link ${name}`);
  }
  const tierRegister = allText.find(([name]) => name === "00c-requirement-tier-traceability-prd.md")?.[1] ?? "";
  const registeredIds = registeredRequirementIds(tierRegister);
  for (const [name, content] of allText) {
    if (name === "00c-requirement-tier-traceability-prd.md" || name === "2026-10-22-market-benchmark.md") continue;
    for (const id of content.matchAll(/\*\*(FR-[A-Z]+-\d+):\*\*/g)) {
      if (!registeredIds.has(id[1])) failures.push(`${name}: unregistered requirement ${id[1]}`);
    }
  }
  return failures;
};

if (process.argv.includes("--self-test")) {
  const parsed = registeredRequirementIds("| 01 Core | FR-CORE-001–003, 005 | FR-CORE-007 | — |");
  if (!parsed.has("FR-CORE-002") || !parsed.has("FR-CORE-005") || parsed.has("FR-CORE-004"))
    throw new Error("tier range parser self-test failed");
  const architecture = registeredRequirementIds("| 16 Architecture | FR-ARCH-001–040 | — | — |");
  if (!architecture.has("FR-ARCH-001") || !architecture.has("FR-ARCH-040") || architecture.has("FR-ARCH-041"))
    throw new Error("architecture tier range parser self-test failed");
  const failures = validate({ directory: join(root, "docs/specs/does-not-exist"), retiredDirectory: join(root, "docs/specs/does-not-exist-either") });
  if (failures.length !== 1 || failures[0] !== "merged People + Payroll folder is missing")
    throw new Error("merged-suite validator self-test failed");
  process.stdout.write("People + Payroll specification self-test passed\n");
} else {
  const failures = validate();
  if (failures.length) {
    process.stderr.write(`${failures.join("\n")}\n`);
    process.exitCode = 1;
  } else process.stdout.write("People + Payroll specification check passed\n");
}
