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

const ZOD_CHUNK = "2i4o_u836_j1p";
const ABLY_CHUNK = "1odqbo2mc4mp2";

const routes = [
  ["dashboard", join(NEXT, "server/app/(authenticated)/dashboard/page_client-reference-manifest.js")],
  ["settings", join(NEXT, "server/app/(authenticated)/settings/page_client-reference-manifest.js")],
  ["build/my-work", join(NEXT, "server/app/(authenticated)/build/my-work/page_client-reference-manifest.js")],
  ["crm/leads", join(NEXT, "server/app/(authenticated)/crm/leads/page_client-reference-manifest.js")],
  ["calendar", join(NEXT, "server/app/(authenticated)/calendar/page_client-reference-manifest.js")],
  ["support/inbox", join(NEXT, "server/app/(authenticated)/support/inbox/page_client-reference-manifest.js")],
  ["chat", join(NEXT, "server/app/(authenticated)/chat/page_client-reference-manifest.js")],
  ["crm/inbox", join(NEXT, "server/app/(authenticated)/crm/inbox/page_client-reference-manifest.js")],
  ["parties", join(NEXT, "server/app/(authenticated)/parties/page_client-reference-manifest.js")],
  ["notifications", join(NEXT, "server/app/(authenticated)/notifications/page_client-reference-manifest.js")],
  ["inbox", join(NEXT, "server/app/(authenticated)/inbox/page_client-reference-manifest.js")],
];

for (const [name, mPath] of routes) {
  const chunks = getChunks(mPath);
  if (!chunks) { console.log(`/${name}: not found`); continue; }
  const hasZod = [...chunks].some((c) => c.includes(ZOD_CHUNK));
  const hasAbly = [...chunks].some((c) => c.includes(ABLY_CHUNK));
  console.log(`/${name}: zod=${hasZod} ably=${hasAbly} totalChunks=${chunks.size}`);
}

console.log("\n=== Chunks NOT in dashboard ===");
const dash = getChunks(join(NEXT, "server/app/(authenticated)/dashboard/page_client-reference-manifest.js"));
console.log("Dashboard chunks:", dash.size);

const settingsChunks = getChunks(join(NEXT, "server/app/(authenticated)/settings/page_client-reference-manifest.js"));
const settingsExtra = [...settingsChunks].filter((c) => !dash.has(c));
console.log("\nSettings extra chunks:");
settingsExtra.map((c) => ({ c, sz: gz(c) })).sort((a, b) => b.sz - a.sz).forEach(({ c, sz }) => console.log(`  ${sz}  ${basename(c)}`));

const supportChunks = getChunks(join(NEXT, "server/app/(authenticated)/support/inbox/page_client-reference-manifest.js"));
const supportExtra = [...supportChunks].filter((c) => !dash.has(c));
console.log("\nSupport/inbox extra chunks:");
supportExtra.map((c) => ({ c, sz: gz(c) })).sort((a, b) => b.sz - a.sz).forEach(({ c, sz }) => console.log(`  ${sz}  ${basename(c)}`));
