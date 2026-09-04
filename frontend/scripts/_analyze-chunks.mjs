#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const NEXT = join(ROOT, ".next");

function getChunks(mPath) {
  if (!existsSync(mPath)) return null;
  const src = readFileSync(mPath, "utf8");
  const m = /__RSC_MANIFEST\s*\[[^\]]*\]\s*=\s*/.exec(src);
  if (!m) return null;
  const start = src.indexOf("{", m.index + m[0].length - 1);
  let depth = 0, end = -1, inStr = false, esc = false;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (esc) { esc = false; continue; }
    if (inStr) {
      if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) return null;
  let parsed;
  try { parsed = JSON.parse(src.slice(start, end + 1)); } catch { return null; }
  const chunks = new Set();
  for (const g of ["clientModules", "ssrModuleMapping"]) {
    const entries = parsed[g];
    if (!entries) continue;
    for (const e of Object.values(entries)) {
      if (e && Array.isArray(e.chunks)) e.chunks.forEach((c) => chunks.add(c));
    }
  }
  return chunks;
}

function gz(chunk) {
  const f = join(NEXT, chunk.replace(/^\/_next\//, "").replace(/^_next\//, ""));
  if (!existsSync(f)) return 0;
  return gzipSync(readFileSync(f), { level: 9 }).length;
}

const DASH_MANIFEST = join(NEXT, "server/app/(authenticated)/dashboard/page_client-reference-manifest.js");
const dash = getChunks(DASH_MANIFEST);

const routes = [
  ["settings", join(NEXT, "server/app/(authenticated)/settings/page_client-reference-manifest.js")],
  ["build/my-work", join(NEXT, "server/app/(authenticated)/build/my-work/page_client-reference-manifest.js")],
  ["crm/leads", join(NEXT, "server/app/(authenticated)/crm/leads/page_client-reference-manifest.js")],
  ["support/inbox", join(NEXT, "server/app/(authenticated)/support/inbox/page_client-reference-manifest.js")],
  ["calendar", join(NEXT, "server/app/(authenticated)/calendar/page_client-reference-manifest.js")],
  ["crm/inbox", join(NEXT, "server/app/(authenticated)/crm/inbox/page_client-reference-manifest.js")],
  ["parties", join(NEXT, "server/app/(authenticated)/parties/page_client-reference-manifest.js")],
  ["chat", join(NEXT, "server/app/(authenticated)/chat/page_client-reference-manifest.js")],
];

for (const [name, mPath] of routes) {
  const chunks = getChunks(mPath);
  if (!chunks) { console.log(`\n=== /${name}: not found ===`); continue; }
  const extras = [...chunks]
    .filter((c) => !dash.has(c))
    .map((c) => ({ c, sz: gz(c) }))
    .sort((a, b) => b.sz - a.sz);
  const total = extras.reduce((s, e) => s + e.sz, 0);
  console.log(`\n=== /${name} (page-only: ${total} bytes, ${extras.length} extra chunks) ===`);
  extras.slice(0, 8).forEach(({ c, sz }) => console.log(`  ${String(sz).padStart(7)}  ${basename(c)}`));
}
