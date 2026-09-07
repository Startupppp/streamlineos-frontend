import { readFileSync, writeFileSync } from 'node:fs';

const FE = 'D:/projects/personal/Streamlineos/frontend';

function patch(relPath, importBlock, patches) {
  const path = `${FE}/${relPath}`;
  let c = readFileSync(path, 'utf8');

  if (importBlock) {
    const lines = c.split('\n');
    let lastImportLine = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ')) lastImportLine = i;
    }
    if (lastImportLine >= 0) {
      while (
        lastImportLine + 1 < lines.length &&
        !lines[lastImportLine + 1].startsWith('import ') &&
        lines[lastImportLine + 1] !== '' &&
        !lines[lastImportLine + 1].startsWith('export') &&
        !lines[lastImportLine + 1].startsWith('const ') &&
        !lines[lastImportLine + 1].startsWith('function ') &&
        !lines[lastImportLine + 1].startsWith('interface ') &&
        !lines[lastImportLine + 1].startsWith('type ') &&
        !lines[lastImportLine + 1].startsWith('"use client"') &&
        !lines[lastImportLine + 1].startsWith('} from')
      ) { lastImportLine++; }
      lines.splice(lastImportLine + 1, 0, '', importBlock);
      c = lines.join('\n');
    }
  }

  for (const [from, to] of patches) {
    if (c.includes(from)) {
      c = c.split(from).join(to);
    } else {
      console.warn(`  WARN: not found in ${relPath}: "${from.slice(0, 80)}"`);
    }
  }

  writeFileSync(path, c, 'utf8');
  console.log(`Updated ${relPath}`);
}

