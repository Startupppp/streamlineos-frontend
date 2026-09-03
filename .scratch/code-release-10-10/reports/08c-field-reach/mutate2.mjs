#!/usr/bin/env node
/**
 * mutate2 — apply DELETE and SENTINEL-RENAME mutations in one position-sorted
 * pass so the two never drift each other's offsets.
 *   node mutate2.mjs <tree> <delete.json> <sentinel.json>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const TREE = process.argv[2];
const dels = JSON.parse(readFileSync(process.argv[3], "utf8")).map((c) => ({ ...c, op: "del" }));
const sens = JSON.parse(readFileSync(process.argv[4], "utf8")).map((c) => ({ ...c, op: "sen" }));

const byFile = new Map();
for (const c of [...dels, ...sens]) {
  if (!byFile.has(c.file)) byFile.set(c.file, []);
  byFile.get(c.file).push(c);
}

let nDel = 0, nSen = 0, skipped = 0;
for (const [rel, items] of byFile) {
  const p = join(TREE, rel);
  let text = readFileSync(p, "utf8");
  items.sort((a, b) => b.pos - a.pos);
  for (const it of items) {
    if (text.slice(it.pos, it.pos + it.field.length) !== it.field) {
      console.error(`SKIP ${rel}:${it.line} ${it.field}`);
      skipped++;
      continue;
    }
    if (it.op === "sen") {
      text = text.slice(0, it.pos) + `__t08_sentinel_${nSen}__` + text.slice(it.pos + it.field.length);
      nSen++;
    } else {
      let end = it.end;
      while (end < text.length && /[ \t]/.test(text[end])) end++;
      if (text[end] === ",") end++;
      let start = it.pos;
      while (start > 0 && /[ \t]/.test(text[start - 1])) start--;
      if (start > 0 && text[start - 1] === "\n") start--;
      text = text.slice(0, start) + text.slice(end);
      nDel++;
    }
  }
  writeFileSync(p, text);
}
console.log(`deleted ${nDel}, sentinel-renamed ${nSen}, skipped ${skipped}, across ${byFile.size} files`);
