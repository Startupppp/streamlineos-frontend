import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const suite = resolve(root, "docs/specs/hrms-payroll-reform");
const dir = resolve(suite, "tickets");
const ledger = JSON.parse(readFileSync(resolve(suite, "architecture-review/execution-ledger.json"), "utf8"));
const prd = readFileSync(resolve(suite, "16-architecture-hardening-prd.md"), "utf8");
const exact = new Map([...prd.matchAll(/^- \*\*(AC-ARCH-\d{3}-\d{2}):\*\* (.+)$/gm)].map((m) => [m[1], m[2]]));
const files = readdirSync(dir).filter((name) => /^\d{2}-.*\.md$/.test(name)).sort();
const failures = [];
const fail = (bad, message) => { if (bad) failures.push(message); };
const seen = new Map();
const tickets = [];

for (const file of files) {
  const body = readFileSync(resolve(dir, file), "utf8");
  const id = Number(file.slice(0, 2));
  const title = body.match(/^# (\d{2}): (.+)$/m);
  const status = body.match(/^\*\*Status:\*\* (.+)$/m)?.[1];
  const blocked = body.match(/^\*\*Blocked by:\*\* (.+)$/m)?.[1];
  const program = body.match(/^\*\*Program:\*\* (AP-\d{2})$/m)?.[1];
  const declared = [...(body.match(/^\*\*Requirements:\*\* (.+)$/m)?.[1].matchAll(/FR-ARCH-\d{3}/g) ?? [])].map((m) => m[0]);
  const checks = [...body.matchAll(/^- \[([ x])\] \*\*(AC-ARCH-\d{3}-\d{2}):\*\* (.+)$/gm)];
  const allChecks = [...body.matchAll(/^- \[([ x])\] /gm)];
  const deps = blocked === "None (can start immediately)" ? [] : [...(blocked?.matchAll(/(?:^|; )(\d{2}) /g) ?? [])].map((m) => Number(m[1]));
  fail(!title || Number(title[1]) !== id, file + ": title/number mismatch");
  fail(!blocked || (blocked !== "None (can start immediately)" && !deps.length), file + ": missing blocking edge");
  fail(!["ready-for-agent", "in-progress", "completed", "needs-info", "ready-for-human", "wontfix"].includes(status), file + ": invalid status");
  fail(!ledger.programs.some((p) => p.id === program), file + ": unknown program");
  for (const dep of deps) fail(dep >= id || dep < 1, file + ": blocker must be an earlier ticket: " + dep);
  for (const match of checks) {
    const [, mark, acId, text] = match;
    fail(seen.has(acId), file + ": duplicate criterion " + acId + " from " + seen.get(acId));
    seen.set(acId, file);
    fail(exact.get(acId) !== text, file + ": PRD criterion drift " + acId);
    const ac = ledger.criteria.find((row) => row.id === acId);
    fail(!ac || ac.expected !== text, file + ": ledger criterion drift " + acId);
    fail(ac?.program !== program && id !== 26, file + ": program mismatch " + acId);
    fail(mark === "x" && !["PASS", "WAIVED"].includes(ac?.status), file + ": checked without closed evidence " + acId);
    fail(mark !== "x" && ["PASS", "WAIVED"].includes(ac?.status), file + ": closed evidence without checked item " + acId);
  }
  if (id === 1) {
    fail(checks.length !== 0 || allChecks.length !== 4, file + ": baseline milestone checklist changed");
  } else {
    fail(allChecks.length !== checks.length, file + ": unmapped checkbox");
    fail(declared.length !== new Set(declared).size, file + ": duplicate requirement");
    for (const req of declared) fail(!checks.some((m) => m[2].startsWith(req.replace("FR-", "AC-") + "-")), file + ": empty requirement " + req);
    for (const match of checks) fail(!declared.includes(match[2].slice(0, 11).replace("AC-", "FR-")), file + ": undeclared criterion " + match[2]);
  }
  tickets.push({ id, file, status, deps, allDone: allChecks.length > 0 && allChecks.every((m) => m[1] === "x") });
}

fail(files.length !== 26, "expected 26 numbered tickets");
for (let id = 1; id <= 26; id++) fail(!tickets.some((t) => t.id === id), "missing ticket " + id);
for (const [acId] of exact) fail(!seen.has(acId), "unmapped acceptance criterion " + acId);
fail(seen.size !== ledger.criteria.length || seen.size !== exact.size, "ticket/ledger/PRD acceptance counts differ");
for (const ticket of tickets) {
  fail(ticket.status === "completed" && !ticket.allDone, ticket.file + ": completed with open checkbox");
  fail(ticket.allDone && ticket.status !== "completed", ticket.file + ": all checked but not completed");
  for (const dep of ticket.deps) {
    const predecessor = tickets.find((t) => t.id === dep);
    fail(!predecessor, ticket.file + ": missing blocker " + dep);
    fail(ticket.status === "completed" && predecessor?.status !== "completed", ticket.file + ": completed before blocker " + dep);
  }
}

if (failures.length) {
  process.stderr.write("FAIL architecture tickets: " + failures.length + " finding(s)\n" + failures.slice(0, 20).join("\n") + "\n");
  process.exitCode = 1;
} else {
  const complete = tickets.filter((t) => t.status === "completed").length;
  process.stdout.write("PASS architecture tickets: " + tickets.length + " files, " + seen.size + " mapped ACs, " + complete + " completed\n");
}
