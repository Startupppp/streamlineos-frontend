#!/usr/bin/env node
/**
 * classify — join the enumerated z.object field surface with the checker-resolved
 * reachability map, and split the result three ways:
 *   READ                 the checker resolved at least one reference
 *   RETAINED-BY-RULE     ticket 08 box 4's four protected classes
 *   CANDIDATE            zero resolved references and not protected
 * CANDIDATE is not a verdict. It is the input to the tsc bite.
 */
import { readFileSync, writeFileSync } from "node:fs";

const S = "/private/tmp/claude-501/-Users-tarunchintakunta-Personal-streamline/20eca33e-bd07-41a6-ac7b-f606f1ada0e1/scratchpad/t08";
const fields = JSON.parse(readFileSync(`${S}/be-fields.json`, "utf8"));
const reach = JSON.parse(readFileSync(`${S}/be-reach-union.json`, "utf8"));

// ---------------------------------------------------------------- protected
// Class 1 — server-controlled tenant / actor identity.
const TENANT_ACTOR = [
  /^org(anization)?Id$/i, /^tenantId$/i, /^orgSlug$/i, /^organizationSlug$/i,
  /^actor/i, /^performedBy/i, /^membershipId$/i, /^orgMembershipId$/i,
  /^createdBy/i, /^updatedBy/i, /^deletedBy/i, /^requestedBy/i, /^approvedBy/i,
  /^uploadedBy/i, /^issuedBy/i, /^authorId$/i, /^senderId$/i, /^triggeredBy/i,
  /^currentUser/i, /^ownerUserId$/i,
];
// Class 2 — idempotency / optimistic concurrency.
const IDEMPOTENCY_VERSION = [
  /^idempotency/i, /^expectedVersion$/, /^version$/, /^lockVersion$/, /^revision$/,
  /^etag$/i, /^ifMatch$/i, /^ifNoneMatch$/i, /^requestId$/i, /^dedupe/i,
  /^clientRequestId$/i, /^nonce$/i, /^replayKey$/i, /^externalId$/i, /^correlationId$/i,
];
// Class 3 — authorization dimensions (feed DataScope / RBAC).
const AUTHZ_DIMENSION = [
  /^scope$/i, /^dataScope$/i, /^visibility$/i, /^isPrivate$/i, /^isPublic$/i,
  /^permission/i, /^role(Id|Key|s)?$/i, /^departmentId$/i, /^teamId$/i, /^branchId$/i,
  /^ownerId$/i, /^assignedTo/i, /^shared(With)?/i, /^access(Level)?$/i, /^allowedRoles$/i,
  /^moduleKey$/i, /^entitlement/i,
];
// Class 4 — audit / record-keeping.
const AUDIT = [
  /^reason$/i, /^auditReason$/i, /^changeReason$/i, /^justification$/i, /^note$/i, /^notes$/i,
  /^ipAddress$/i, /^userAgent$/i, /^source$/i, /^sourceIp$/i, /^comment$/i,
  /^occurredAt$/i, /^recordedAt$/i, /^effectiveDate$/i, /^signedAt$/i, /^consent/i,
];
const CLASSES = [
  ["tenant/actor", TENANT_ACTOR],
  ["idempotency/version", IDEMPOTENCY_VERSION],
  ["authz-dimension", AUTHZ_DIMENSION],
  ["audit", AUDIT],
];

function protectedClass(name) {
  for (const [label, pats] of CLASSES) for (const p of pats) if (p.test(name)) return label;
  return null;
}

// ------------------------------------------------------------------- excluded
const EXCLUDED_MODULE = /^src\/modules\/(crm|inventory|leads|deals|contacts|quotes)\//;

const rows = [];
for (const s of fields.schemas) {
  if (s.isSpec) continue;
  for (const f of s.fields) {
    if (f.name === "<spread>") continue;
    const k = `${s.file}:${f.pos}`;
    const r = reach[k];
    rows.push({
      file: s.file,
      schema: s.name,
      strict: s.strict,
      field: f.name,
      line: f.line,
      pos: f.pos,
      end: f.end,
      optional: f.optional,
      kinds: r ? r.kinds : null,
      from: r ? r.from : null,
      excluded: EXCLUDED_MODULE.test(s.file),
      klass: protectedClass(f.name),
    });
  }
}

const total = rows.length;
const read = rows.filter((r) => r.kinds);
const unread = rows.filter((r) => !r.kinds);
const unreadExcluded = unread.filter((r) => r.excluded);
const unreadInScope = unread.filter((r) => !r.excluded);
const unreadProtected = unreadInScope.filter((r) => r.klass);
const candidates = unreadInScope.filter((r) => !r.klass);

console.log(`total top-level z.object fields (non-spec):   ${total}`);
console.log(`  READ (checker resolved >=1 reference):     ${read.length}`);
console.log(`  zero resolved references:                  ${unread.length}`);
console.log(`    in CRM/inventory (excluded from release): ${unreadExcluded.length}`);
console.log(`    RETAINED-BY-RULE (protected class):       ${unreadProtected.length}`);
for (const [label] of CLASSES) {
  console.log(`        ${label.padEnd(20)} ${unreadProtected.filter((r) => r.klass === label).length}`);
}
console.log(`    CANDIDATE (needs the tsc bite):           ${candidates.length}`);

// read-kind breakdown
const kindTally = {};
for (const r of read) for (const k of Object.keys(r.kinds)) kindTally[k] = (kindTally[k] || 0) + 1;
console.log(`\nread-kind tally (a field may have several): ${JSON.stringify(kindTally)}`);
const spreadOnly = read.filter((r) => Object.keys(r.kinds).every((k) => k === "spread" || k === "wholeobject" || k === "restcarry"));
console.log(`fields whose ONLY reference is a whole-object carry (spread/stringify/rest): ${spreadOnly.length}`);

writeFileSync(`${S}/classified.json`, JSON.stringify({ total, rows }, null, 1));
writeFileSync(`${S}/candidates.json`, JSON.stringify(candidates, null, 1));
writeFileSync(`${S}/spread-only.json`, JSON.stringify(spreadOnly, null, 1));

// candidate distribution by module
const byMod = {};
for (const c of candidates) {
  const m = c.file.replace(/^src\/modules\//, "").split("/")[0];
  byMod[m] = (byMod[m] || 0) + 1;
}
console.log(`\ncandidates by module:`);
Object.entries(byMod).sort((a, b) => b[1] - a[1]).slice(0, 40).forEach(([m, n]) => console.log(`  ${String(n).padStart(4)}  ${m}`));
