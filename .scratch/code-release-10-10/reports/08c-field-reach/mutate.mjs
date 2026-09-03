#!/usr/bin/env node
/**
 * mutate — delete a set of z.object property assignments from a COPY of the tree
 * and let tsc say which ones were being read. Deleting the field is the only
 * instrument that resolves at field granularity and cannot be fooled by a name
 * collision, which is why every removal in this ticket is decided here and not
 * by the reachability map.
 *
 *   node mutate.mjs <tree> <candidates.json>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const TREE = process.argv[2];
const LIST = process.argv[3];
const cands = JSON.parse(readFileSync(LIST, "utf8"));

const byFile = new Map();
for (const c of cands) {
  if (!byFile.has(c.file)) byFile.set(c.file, []);
  byFile.get(c.file).push(c);
}

let deleted = 0;
for (const [rel, items] of byFile) {
  const p = join(TREE, rel);
  let text = readFileSync(p, "utf8");
  // delete from the end so earlier offsets stay valid
  items.sort((a, b) => b.pos - a.pos);
  for (const it of items) {
    const slice = text.slice(it.pos, it.end);
    if (!slice.startsWith(it.field)) {
      // offset drifted (should not happen — the copy is byte-identical)
      console.error(`SKIP offset mismatch ${rel}:${it.line} ${it.field} got ${JSON.stringify(slice.slice(0, 30))}`);
      continue;
    }
    let end = it.end;
    // swallow a trailing comma and the rest of the line
    while (end < text.length && /[ \t]/.test(text[end])) end++;
    if (text[end] === ",") end++;
    let start = it.pos;
    // swallow the leading indentation and the preceding newline
    while (start > 0 && /[ \t]/.test(text[start - 1])) start--;
    if (start > 0 && text[start - 1] === "\n") start--;
    text = text.slice(0, start) + text.slice(end);
    deleted++;
  }
  writeFileSync(p, text);
}
console.log(`deleted ${deleted} property assignments across ${byFile.size} files`);
