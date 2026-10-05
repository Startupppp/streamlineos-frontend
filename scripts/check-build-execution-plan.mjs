import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const specRoot = join(root, "docs/build-module");
const routeRoot = join(root, "frontend/app/(authenticated)/build");
const floors = { routes: 75, requirements: 29, ledger: 36, packages: 17 };
const required = [
  "README.md",
  "audit/requirements-coverage.md",
  "audit/research-traceability.md",
  "experience/routes-and-screen-decisions.md",
  "experience/screens/README.md",
  "experience/screens/shared-screen-contract.md",
  "architecture/08-deep-module-reconciliation.md",
  "implementation/17-agent-coordination-and-work-ownership.md",
  "implementation/18-architecture-work-package-registry.md",
  "implementation/19-complete-surface-behavior-matrix.md",
  "implementation/REQUIREMENT-LEDGER.md",
  "implementation/WORK-CLAIMS.md",
];
const read = (path) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");

const section = (content, heading) => {
  const lines = content.split("\n");
  const start = lines.findIndex((line) => line.startsWith(`## ${heading}`));
  if (start < 0) return null;
  const end = lines.findIndex((line, index) => index > start && line.startsWith("## "));
  return lines.slice(start + 1, end < 0 ? undefined : end).join("\n");
};

const checkExactSet = (name, expected, actual, failures) => {
  for (const value of new Set(expected)) {
    if (expected.filter((candidate) => candidate === value).length > 1)
      failures.push(`${name}: duplicate source ${value}`);
  }
  for (const value of new Set(expected))
    if (!actual.includes(value)) failures.push(`${name}: missing ${value}`);
  for (const value of new Set(actual)) {
    if (!expected.includes(value)) failures.push(`${name}: stale/unimplemented ${value}`);
    if (actual.filter((candidate) => candidate === value).length > 1)
      failures.push(`${name}: duplicate ${value}`);
  }
};

const checkNumberedRows = (name, content, prefix, floor, failures) => {
  const ids = [...content.matchAll(new RegExp(`^\\|\\s*(${prefix}-?(\\d+))\\s*\\|`, "gm"))]
    .map((match) => ({ id: match[1], number: Number(match[2]) }));
  if (ids.length < floor) failures.push(`${name}: found ${ids.length} rows; expected at least ${floor}`);
  for (let n = 1; n <= ids.length; n++) {
    if (!ids.some((row) => row.number === n))
      failures.push(`${name}: missing ${prefix}${prefix === "BLD" ? "-" : ""}${String(n).padStart(prefix === "BLD" ? 3 : 2, "0")}`);
  }
  for (const id of new Set(ids.map((row) => row.id))) {
    if (ids.filter((row) => row.id === id).length > 1) failures.push(`${name}: duplicate ${id}`);
  }
  return ids.length;
};

const parseRouteRows = (content, failures) => {
  const table = section(content, "Existing routes");
  if (table === null) {
    failures.push("route decisions: missing Existing routes section");
    return [];
  }
  const rows = [];
  for (const line of table.split("\n")) {
    if (!line.startsWith("| ") || line.startsWith("| Existing route") || line.startsWith("|---")) continue;
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    const route = /^`(\/build(?:\/[^`]+)?)`$/.exec(cells[0] ?? "")?.[1];
    const screen = /^\[[^\]]+\]\((\.\/screens\/[^)]+\.md)\)$/.exec(cells[3] ?? "")?.[1];
    if (!route || !cells[1] || !cells[2] || !screen || !cells[4]) {
      failures.push(`route decisions: malformed row ${line.slice(0, 120)}`);
      continue;
    }
    rows.push({ route, screen });
  }
  return rows;
};

const pageRoutes = (directory, segments = []) => {
  const routes = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name.startsWith("@")) continue;
      const next = /^\([^)]*\)$/.test(entry.name) ? segments : [...segments, entry.name];
      routes.push(...pageRoutes(join(directory, entry.name), next));
    } else if (entry.isFile() && /^page\.[jt]sx?$/.test(entry.name)) {
      routes.push(`/build${segments.length ? `/${segments.join("/")}` : ""}`);
    }
  }
  return routes;
};

const canonicalMarkdownFiles = (directory) => {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && !entry.name.startsWith("streamlineos-"))
      files.push(...canonicalMarkdownFiles(join(directory, entry.name)));
    else if (entry.isFile() && entry.name.endsWith(".md"))
      files.push(join(directory, entry.name));
  }
  return files;
};

const checkLocalLinks = (file, content, fileExists, failures) => {
  for (const match of content.matchAll(/!?\[[^\]\n]*\]\((<[^>]+>|[^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    let target = match[1].replace(/^<|>$/g, "");
    if (/^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(target)) continue;
    target = target.split(/[?#]/)[0];
    try {
      target = decodeURIComponent(target);
    } catch {
      failures.push(`${file}: invalid URL encoding in ${match[1]}`);
      continue;
    }
    if (target && !fileExists(resolve(dirname(file), target)))
      failures.push(`${file}: broken local link ${match[1]}`);
  }
};

const parsePackageRows = (content, failures) => {
  const ids = [...content.matchAll(/^\|\s*`(ARCH-\d{2}[A-Z]?-[A-Z-]+)`\s*\|/gm)]
    .map((match) => match[1]);
  if (ids.length < floors.packages)
    failures.push(`work packages: found ${ids.length}; expected at least ${floors.packages}`);
  for (const id of new Set(ids)) {
    if (ids.filter((candidate) => candidate === id).length > 1)
      failures.push(`work packages: duplicate ${id}`);
  }
  return ids;
};

const checkArchitectureDecisions = (content, packageIds, failures) => {
  const ids = [...content.matchAll(/^###\s+(ARC-\d{2})\b/gm)].map((match) => match[1]);
  for (let n = 1; n <= 16; n++) {
    const id = `ARC-${String(n).padStart(2, "0")}`;
    if (ids.filter((candidate) => candidate === id).length !== 1)
      failures.push(`architecture decisions: ${id} must appear exactly once`);
    if (!packageIds.some((candidate) => candidate.startsWith(`ARCH-${String(n).padStart(2, "0")}`)))
      failures.push(`architecture decisions: ${id} has no registered work package`);
  }
  for (const id of ids) {
    if (Number(id.slice(4)) > 16) failures.push(`architecture decisions: unexpected ${id}`);
  }
  return ids.length;
};

const checkActiveClaims = (content, packageIds, failures) => {
  const active = section(content, "Active claims");
  if (active === null) {
    failures.push("work claims: missing Active claims section");
    return;
  }
  const packages = [], seams = [];
  for (const line of active.split("\n")) {
    if (!line.startsWith("| `ARCH-")) continue;
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    const id = /^`(ARCH-[^`]+)`$/.exec(cells[0] ?? "")?.[1];
    if (!id || !packageIds.includes(id)) failures.push(`work claims: unknown package ${cells[0]}`);
    if (!cells[5] || !cells[6] || !cells[7] || !cells[8])
      failures.push(`work claims: incomplete claim ${id ?? line.slice(0, 60)}`);
    if (cells[8] && !["CLAIMED", "IN_PROGRESS", "HANDOFF_READY", "BLOCKED", "MERGED", "RELEASE_VERIFIED"].includes(cells[8]))
      failures.push(`work claims: invalid status ${cells[8]} for ${id}`);
    if (id) packages.push(id);
    if (cells[5]) seams.push(cells[5]);
  }
  for (const id of new Set(packages)) {
    if (packages.filter((candidate) => candidate === id).length > 1)
      failures.push(`work claims: duplicate active package ${id}`);
  }
  for (const seam of new Set(seams)) {
    if (seams.filter((candidate) => candidate === seam).length > 1)
      failures.push(`work claims: duplicate primary seam ${seam}`);
  }
};

const validate = () => {
  const failures = [];
  for (const file of required) {
    if (!existsSync(join(specRoot, file)))
      failures.push(`missing canonical specification docs/build-module/${file}`);
  }
  if (!existsSync(routeRoot)) failures.push("missing Build route root frontend/app/(authenticated)/build");
  if (failures.length) return { failures };

  const rows = parseRouteRows(read(join(specRoot, "experience/routes-and-screen-decisions.md")), failures);
  const actual = pageRoutes(routeRoot);
  if (rows.length < floors.routes)
    failures.push(`route decisions: found ${rows.length}; expected at least ${floors.routes}`);
  if (actual.length < floors.routes)
    failures.push(`Build pages: found ${actual.length}; expected at least ${floors.routes}`);
  checkExactSet("Build routes", actual, rows.map((row) => row.route), failures);
  const screenFields = [
    "Audience:", "Entry points:", "**Layout and components:**",
    "**Exact projection/card/row fields:**", "**Filters and operators:**",
    "**Primary and secondary flows:**", "**Opening and return:**",
    "**Data/API/schema:**", "**Access and cache:**", "**States and recovery:**",
    "**Mobile:**", "**Acceptance:**",
  ];
  for (const { route, screen } of rows) {
    const path = resolve(specRoot, "experience", screen);
    if (!existsSync(path)) {
      failures.push(`screen contract missing for ${route}: ${screen}`);
      continue;
    }
    const content = read(path);
    const marker = `Route: \`${route}\``;
    const count = content.split(marker).length - 1;
    if (count !== 1) {
      failures.push(`screen contract ${screen} lacks route section for ${route}`);
      continue;
    }
    const start = content.indexOf(marker);
    const next = content.indexOf("\n### ", start);
    const block = content.slice(start, next < 0 ? undefined : next);
    for (const field of screenFields) {
      if (!block.includes(field)) failures.push(`screen contract ${screen} ${route}: missing ${field}`);
    }
  }

  const requirements = checkNumberedRows("requirements coverage", read(join(specRoot, "audit/requirements-coverage.md")), "R", floors.requirements, failures);
  const ledger = checkNumberedRows("implementation ledger", read(join(specRoot, "implementation/REQUIREMENT-LEDGER.md")), "BLD", floors.ledger, failures);
  const packageIds = parsePackageRows(read(join(specRoot, "implementation/18-architecture-work-package-registry.md")), failures);
  const decisions = checkArchitectureDecisions(read(join(specRoot, "architecture/08-deep-module-reconciliation.md")), packageIds, failures);
  checkActiveClaims(read(join(specRoot, "implementation/WORK-CLAIMS.md")), packageIds, failures);
  const files = canonicalMarkdownFiles(specRoot);
  for (const file of files) checkLocalLinks(file, read(file), existsSync, failures);
  return { failures, routes: actual.length, requirements, ledger, decisions, packages: packageIds.length, files: files.length };
};

const runSelfTest = () => {
  const cases = [];
  const test = (name, run) => {
    try { run(); cases.push({ name, passed: true }); }
    catch (error) { cases.push({ name, passed: false, error: error.message }); }
  };
  const assert = (condition, detail) => { if (!condition) throw new Error(detail); };

  test("route comparison rejects missing, extra, and duplicate rows", () => {
    const failures = [];
    checkExactSet("fixture", ["/build", "/build/my-work"], ["/build", "/build", "/build/old"], failures);
    for (const marker of ["missing /build/my-work", "stale/unimplemented /build/old", "duplicate /build"])
      assert(failures.some((failure) => failure.includes(marker)), JSON.stringify(failures));
  });
  test("route comparison rejects duplicate page sources", () => {
    const failures = [];
    checkExactSet("fixture", ["/build", "/build"], ["/build"], failures);
    assert(failures.some((f) => f.includes("duplicate source /build")), JSON.stringify(failures));
  });
  test("route parser rejects missing section and malformed rows", () => {
    const missing = [], malformed = [];
    parseRouteRows("# no routes", missing);
    parseRouteRows("## Existing routes\n| `/build` | Keep | `/build` | absent | open |", malformed);
    assert(missing.length === 1 && malformed.length === 1, `${missing}; ${malformed}`);
  });
  test("numbered requirements reject skipped sequence and low count", () => {
    const failures = [];
    checkNumberedRows("fixture", "| R01 | one |\n| R03 | three |", "R", 3, failures);
    assert(failures.some((f) => f.includes("at least 3")) && failures.some((f) => f.includes("missing R02")), JSON.stringify(failures));
  });
  test("package registry rejects vacuous and duplicate inventory", () => {
    const failures = [];
    parsePackageRows("| `ARCH-01-MODULE-ACCESS` | a |\n| `ARCH-01-MODULE-ACCESS` | b |", failures);
    assert(failures.some((f) => f.includes("expected at least")) && failures.some((f) => f.includes("duplicate")), JSON.stringify(failures));
  });
  test("architecture decisions reject missing package mapping", () => {
    const failures = [];
    checkArchitectureDecisions("### ARC-01 — example", ["ARCH-01-EXAMPLE"], failures);
    assert(failures.some((f) => f.includes("ARC-02 must appear")) && failures.some((f) => f.includes("ARC-02 has no registered")), JSON.stringify(failures));
  });
  test("active claim rejects unknown package", () => {
    const failures = [];
    checkActiveClaims("## Active claims\n| `ARCH-99-UNKNOWN` | id | task | branch | base | seam | path | prereq | CLAIMED | date | handoff |", ["ARCH-01-MODULE-ACCESS"], failures);
    assert(failures.some((f) => f.includes("unknown package")), JSON.stringify(failures));
  });
  test("local link checker rejects missing target", () => {
    const failures = [];
    checkLocalLinks("/fixture/readme.md", "[missing](./gone.md)", () => false, failures);
    assert(failures.length === 1 && failures[0].includes("gone.md"), JSON.stringify(failures));
  });
  test("valid fixture passes route and link checks", () => {
    const failures = [];
    const rows = parseRouteRows("## Existing routes\n| `/build` | Keep | `/build` | [Entry](./screens/projects.md) | redirect |", failures);
    checkExactSet("fixture", ["/build"], rows.map((row) => row.route), failures);
    checkLocalLinks("/fixture/readme.md", "[present](./present.md)", () => true, failures);
    assert(failures.length === 0, JSON.stringify(failures));
  });
  for (const result of cases)
    (result.passed ? process.stdout : process.stderr).write(`  ${result.passed ? "PASS" : "FAIL"}  ${result.name}${result.error ? `: ${result.error}` : ""}\n`);
  const failed = cases.filter((result) => !result.passed).length;
  process.stdout.write(`\nbuild execution plan self-test: ${cases.length - failed} passed, ${failed} failed\n`);
  if (failed) process.exitCode = 1;
};

if (process.argv.includes("--self-test")) {
  runSelfTest();
} else {
  const result = validate();
  if (result.failures.length) {
    process.stderr.write(`${result.failures.join("\n")}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(
      `build execution plan check passed\n` +
      `  verified: ${result.routes} Build pages each map to one route decision and screen section\n` +
      `  verified: ${result.requirements} coverage requirements, ${result.ledger} implementation requirements, ${result.decisions} architecture decisions, ${result.packages} work packages\n` +
      `  verified: active package claims and local links across ${result.files} canonical Markdown files\n` +
      `  not checked: product behavior, browser access, persistence, or deployment evidence\n`,
    );
  }
}
