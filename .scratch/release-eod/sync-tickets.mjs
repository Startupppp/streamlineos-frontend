import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const map = JSON.parse(readFileSync('.scratch/release-eod/prd-status-map.json', 'utf8'));
const dir = '.scratch/code-release-10-10-v2/issues';
let flipped = 0, seen = 0;

for (const f of readdirSync(dir).filter((n) => n.endsWith('.md'))) {
  const p = join(dir, f);
  const lines = readFileSync(p, 'utf8').split('\n');
  let changed = false;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\s*)- \[( |x)\] \*\*(PRD-C\d{3})\*\*/);
    if (!m) continue;
    seen++;
    const want = map[m[3]]?.state;
    if (!want || want === m[2]) continue;
    lines[i] = lines[i].replace(/^(\s*)- \[[ x]\]/, `$1- [${want}]`);
    changed = true; flipped++;
  }
  if (changed) writeFileSync(p, lines.join('\n'));
}
console.log(`ticket criteria seen ${seen}, flipped ${flipped}`);
