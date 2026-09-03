#!/usr/bin/env node
/**
 * bite-round — one iteration of the deletion bite.
 *
 * THE VACUITY TRAP THIS GUARDS. Deleting EVERY field of a `z.object({...})`
 * leaves `z.object({})`, whose inferred type zod widens to
 * `Record<string, never>`. That type carries a STRING INDEX SIGNATURE, so
 * `body.anything` type-checks and every read of every deleted field goes
 * silent. Round 1 of this ticket deleted 364 fields, emptied several schemas
 * outright, and reported 90 errors; round 2 deleted a strict SUBSET of 138 and
 * reported 30 errors the first round had not — including a whole
 * `platform.service.ts` contact form. A single-shot bite is therefore NOT
 * sound. This driver:
 *   - never empties a schema: it keeps the first field of any schema all of
 *     whose fields are candidates, and defers it to a later round
 *   - iterates until a round reports zero errors
 *
 * Usage: node bite-round.mjs <in.json> <out-kept.json> <out-deferred.json>
 */
import { readFileSync, writeFileSync } from "node:fs";
const S = "/private/tmp/claude-501/-Users-tarunchintakunta-Personal-streamline/20eca33e-bd07-41a6-ac7b-f606f1ada0e1/scratchpad/t08";

const IN = process.argv[2];
const OUT_DELETE = process.argv[3];
const OUT_DEFER = process.argv[4];

const fields = JSON.parse(readFileSync(`${S}/be-fields.json`, "utf8"));
const cands = JSON.parse(readFileSync(IN, "utf8"));

// how many top-level fields does each schema literal have?
const schemaSize = new Map();
for (const s of fields.schemas) {
  if (s.isSpec) continue;
  schemaSize.set(`${s.file}|${s.name}|${s.line}`, s.fieldCount);
}
// candidates grouped by their schema literal
const byLit = new Map();
for (const c of cands) {
  // find the literal this field belongs to: the schema in the same file whose
  // field list contains this exact pos
  const lit = fields.schemas.find(
    (s) => !s.isSpec && s.file === c.file && s.fields.some((f) => f.pos === c.pos),
  );
  const key = lit ? `${lit.file}|${lit.name}|${lit.line}` : `${c.file}|${c.schema}|?`;
  if (!byLit.has(key)) byLit.set(key, { size: lit ? lit.fieldCount : 99, items: [] });
  byLit.get(key).items.push(c);
}

const del = [];
const defer = [];
for (const [key, g] of byLit) {
  if (g.items.length >= g.size) {
    // would empty the literal -> keep one back so the index signature never appears
    const sorted = [...g.items].sort((a, b) => a.pos - b.pos);
    defer.push(sorted[0]);
    del.push(...sorted.slice(1));
  } else {
    del.push(...g.items);
  }
}
writeFileSync(OUT_DELETE, JSON.stringify(del, null, 1));
writeFileSync(OUT_DEFER, JSON.stringify(defer, null, 1));
console.log(`input candidates: ${cands.length}`);
console.log(`schemas that would be EMPTIED (index-signature trap): ${defer.length}`);
console.log(`deleting this round: ${del.length}   deferred: ${defer.length}`);
