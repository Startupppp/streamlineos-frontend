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
  "08-competitive-coverage-release-prd.md",
  "08a-competitor-benchmark-prd.md",
  "09-implementation-migration-cockpit-prd.md",
  "10-current-product-gaps-prd.md",
  "11-reporting-manager-prd.md",
  "2026-10-22-market-benchmark.md",
];

const validate = ({ directory = suite, retiredDirectory = formerSuite } = {}) => {
  const failures = [];
  if (existsSync(retiredDirectory)) failures.push("former HRMS specification folder still exists");
  if (!existsSync(directory)) return [...failures, "merged People + Payroll folder is missing"];

  const files = readdirSync(directory).filter((name) => extname(name) === ".md");
  for (const name of required) {
    if (!files.includes(name)) failures.push(`missing merged document: ${name}`);
  }
  const allText = files.map((name) => [name, readFileSync(join(directory, name), "utf8")]);
  for (const [name, content] of allText) {
    if (/^\s*- \[[xX]\]/m.test(content))
      failures.push(`${name}: completed checkbox belongs in evidence prose, not the open queue`);
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
  for (const [name, content] of allText) {
    if (name === "00c-requirement-tier-traceability-prd.md" || name === "2026-10-22-market-benchmark.md") continue;
    for (const id of content.matchAll(/\*\*(FR-[A-Z]+-\d+)\*\*/g)) {
      if (!tierRegister.includes(id[1])) failures.push(`${name}: unregistered requirement ${id[1]}`);
    }
  }
  return failures;
};

if (process.argv.includes("--self-test")) {
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
