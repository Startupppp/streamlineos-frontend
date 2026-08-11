import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const ROOT = "D:/projects/personal/Streamlineos/backend/src";
const files = execSync(`find . -name "*.controller.ts" ! -name "*spec*"`, {
  cwd: ROOT,
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean);

const HTTP = /@(Get|Post|Put|Patch|Delete|Head|Options|All)\s*\(/;
const rows = [];

for (const rel of files) {
  const src = readFileSync(`${ROOT}/${rel}`, "utf8");
  const lines = src.split("\n");

  const classIdx = lines.findIndex((l) => /^export class /.test(l));
  const classHead = lines.slice(0, classIdx < 0 ? lines.length : classIdx).join("\n");
  const classPerm = /@RequirePermission\("([^"]+)"/.exec(classHead)?.[1] ?? null;
  const classPublic = /@Public\(\)/.test(classHead);
  const classGuards = /@UseGuards\(([^)]*)\)/s.exec(classHead)?.[1] ?? "";
  const classModule = /@RequireModule\("([^"]+)"/.exec(classHead)?.[1] ?? null;

  for (let i = 0; i < lines.length; i++) {
    if (!HTTP.test(lines[i])) continue;
    // walk upward over the contiguous decorator block for this handler
    let start = i;
    while (start > 0) {
      const prev = lines[start - 1].trim();
      if (prev.startsWith("@") || prev === "" || prev.startsWith(")") || prev.startsWith("//") || prev.startsWith("*") || prev.startsWith("/*")) {
        if (prev === "" ) { if (start - 1 > 0 && !lines[start - 2].trim().startsWith("@") && !lines[start-2].trim().startsWith(")")) break; }
        start--;
      } else break;
    }
    const block = lines.slice(start, i + 6).join("\n");
    const perm = /@RequirePermission\("([^"]+)"/.exec(block)?.[1] ?? classPerm;
    const isPublic = /@Public\(\)/.test(block) || classPublic;
    const method = HTTP.exec(lines[i])[1];
    const path = /@\w+\(\s*["'`]([^"'`]*)["'`]/.exec(lines[i])?.[1] ?? "";
    const handler = (lines.slice(i, i + 8).find((l) => /^\s{2}(async\s+)?[a-zA-Z_]\w*\s*\(/.test(l)) ?? "").trim().slice(0, 60);

    rows.push({
      file: rel.replace(/^\.\//, ""),
      line: i + 1,
      method,
      path,
      handler,
      perm,
      isPublic,
      classGuards: classGuards.replace(/\s+/g, " ").trim(),
      classModule,
    });
  }
}

const undeclared = rows.filter((r) => !r.perm && !r.isPublic);
const publics = rows.filter((r) => r.isPublic);

console.log(`TOTAL ENDPOINTS: ${rows.length}`);
console.log(`  declared @RequirePermission: ${rows.filter((r) => r.perm).length}`);
console.log(`  @Public: ${publics.length}`);
console.log(`  UNDECLARED (no perm, not public): ${undeclared.length}`);

console.log(`\n=== UNDECLARED ENDPOINTS ===`);
const byFile = new Map();
for (const r of undeclared) {
  if (!byFile.has(r.file)) byFile.set(r.file, []);
  byFile.get(r.file).push(r);
}
for (const [file, rs] of [...byFile.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n${file}  [guards: ${rs[0].classGuards || "NONE"}]`);
  for (const r of rs) console.log(`   :${r.line} ${r.method} "${r.path}" ${r.handler}`);
}

console.log(`\n=== @Public ENDPOINTS (${publics.length}) ===`);
for (const r of publics) console.log(`${r.file}:${r.line} ${r.method} "${r.path}"`);
