import { readdirSync, readFileSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const APP_DIR = join(ROOT, "app");

const CLIENT_PAGE_CEILING = 304;

function assert(cond, msg) {
  if (!cond) { console.error("SELF-TEST FAIL:", msg); process.exit(1); }
}

function* findPages(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* findPages(full);
    else if (entry.name === "page.tsx" || entry.name === "page.ts") yield full;
  }
}

function hasUseClient(filePath) {
  const content = readFileSync(filePath, "utf8").replace(/^﻿/, "");
  return /^["']use client["']/m.test(content);
}

function countPages(appDir) {
  let total = 0;
  let client = 0;
  for (const file of findPages(appDir)) {
    total++;
    if (hasUseClient(file)) client++;
  }
  return { total, client };
}

function runSelfTest() {
  console.log("Running self-test...\n");

  const synthDir = join(ROOT, ".check-client-pages-self-test");
  const pagesDir = join(synthDir, "app", "routes");
  mkdirSync(pagesDir, { recursive: true });

  writeFileSync(join(pagesDir, "page.tsx"), '"use client";\nexport default function P() { return null; }\n');
  writeFileSync(join(join(pagesDir, ".."), "page.tsx"), 'export default function Q() { return null; }\n');

  const { total, client } = countPages(join(synthDir, "app"));

  assert(total === 2, `expected 2 total pages, got ${total}`);
  assert(client === 1, `expected 1 client page, got ${client}`);

  rmSync(synthDir, { recursive: true, force: true });

  console.log("PASS: self-test (2 assertions)\n");
  console.log("  (a) found 2 page.tsx files in the fixture tree");
  console.log("  (b) correctly identified 1 with \"use client\"");
  process.exit(0);
}

const args = process.argv.slice(2);
if (args.includes("--self-test")) runSelfTest();

const { total, client } = countPages(APP_DIR);
const pct = total > 0 ? ((client / total) * 100).toFixed(1) : "0.0";

console.log(`Client pages: ${client} of ${total} (${pct}%)`);
console.log(`Ceiling:      ${CLIENT_PAGE_CEILING}`);

if (client > CLIENT_PAGE_CEILING) {
  console.error(`\n✖  Client-page count (${client}) exceeds ceiling (${CLIENT_PAGE_CEILING}). Convert or remove "use client" from the new pages before merging.`);
  process.exit(1);
} else {
  console.log(`\n✔  Within ceiling (${CLIENT_PAGE_CEILING - client} below limit).`);
  process.exit(0);
}
