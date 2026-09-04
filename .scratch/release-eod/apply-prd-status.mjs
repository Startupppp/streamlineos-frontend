import { readFileSync, writeFileSync } from 'node:fs';

const prdPath = process.argv[2];
const mapPath = process.argv[3];
const dryRun = process.argv.includes('--dry-run');

const prd = readFileSync(prdPath, 'utf8');
const map = JSON.parse(readFileSync(mapPath, 'utf8'));

const lines = prd.split('\n');
const applied = [];
const missing = new Set(Object.keys(map));

for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/^- \[( |x)\] \*\*\[(PRD-C\d{3})\]\*\*/);
  if (!m) continue;
  const id = m[2];
  const entry = map[id];
  if (!entry) continue;
  missing.delete(id);

  if (entry.state === 'x') lines[i] = lines[i].replace(/^- \[ \]/, '- [x]');

  if (entry.evidence) {
    const indent = '      ';
    const block = entry.evidence.split('\n').map((l) => indent + l);
    let j = i + 1;
    while (j < lines.length && lines[j].startsWith(indent)) j++;
    lines.splice(j, 0, ...block);
    i = j + block.length - 1;
  }
  applied.push(`${id} -> [${entry.state}]`);
}

console.log(`applied ${applied.length} of ${Object.keys(map).length}`);
if (missing.size) console.log(`NOT FOUND IN PRD: ${[...missing].join(', ')}`);
if (!dryRun) writeFileSync(prdPath, lines.join('\n'));
else console.log('(dry run — no write)');
