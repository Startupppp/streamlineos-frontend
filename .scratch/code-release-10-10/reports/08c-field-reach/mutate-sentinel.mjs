#!/usr/bin/env node
/**
 * mutate-sentinel — for a field that cannot be deleted because it is the LAST
 * field of its z.object (deleting it yields `Record<string, never>`, whose index
 * signature makes every read type-check and every bite vacuous), RENAME it to a
 * sentinel instead. The literal stays non-empty, so no index signature appears,
 * and any read of the original name is a hard TS2339.
 *
 *   node mutate-sentinel.mjs <tree> <fields.json>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const TREE = process.argv[2];
const cands = JSON.parse(readFileSync(process.argv[3], "utf8"));

const byFile = new Map();
for (const c of cands) {
  if (!byFile.has(c.file)) byFile.set(c.file, []);
  byFile.get(c.file).push(c);
}

let renamed = 0;
for (const [rel, items] of byFile) {
  const p = join(TREE, rel);
  let text = readFileSync(p, "utf8");
  items.sort((a, b) => b.pos - a.pos);
  for (const it of items) {
    const slice = text.slice(it.pos, it.pos + it.field.length);
    if (slice !== it.field) {
      console.error(`SKIP ${rel}:${it.line} ${it.field} got ${JSON.stringify(slice)}`);
      continue;
    }
    text = text.slice(0, it.pos) + `__t08_sentinel_${renamed}__` + text.slice(it.pos + it.field.length);
    renamed++;
  }
  writeFileSync(p, text);
}
console.log(`renamed ${renamed} last-field property assignments to sentinels across ${byFile.size} files`);
