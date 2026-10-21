import fs from "fs";
import path from "path";

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".next" || ent.name === "dist") continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.(tsx|jsx)$/.test(ent.name) && !/\.(test|a11y)\./.test(ent.name)) out.push(p);
  }
  return out;
}

const files = ["features", "app", "components"].flatMap((d) => walk(d));
const missing = [];
const withHref = [];
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  if (!src.includes("<StatCard")) continue;
  const parts = src.split("<StatCard");
  for (let i = 1; i < parts.length; i++) {
    const head = parts[i].slice(0, 1200);
    if (/^(Grid|Skeleton|Props)/.test(head)) continue;
    const endCandidates = [head.indexOf("/>"), head.indexOf(">")].filter((n) => n >= 0);
    const end = Math.min(...endCandidates);
    const tag = head.slice(0, end);
    const labelMatch = tag.match(/label="([^"]+)"/) || tag.match(/label=\{"([^"]+)"\}/) || tag.match(/label=\{([^}]+)\}/);
    const label = labelMatch ? labelMatch[1] : "?";
    const hasHref = /\bhref=/.test(tag);
    (hasHref ? withHref : missing).push({ f: f.replaceAll("\\", "/"), label });
  }
}
console.log("WITH HREF", withHref.length);
console.log("MISSING", missing.length);
const byFile = {};
for (const m of missing) (byFile[m.f] ??= []).push(m.label);
for (const [f, labels] of Object.entries(byFile)) console.log(`${f} :: ${labels.join(" | ")}`);
