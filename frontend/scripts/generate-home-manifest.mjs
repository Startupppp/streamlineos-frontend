/**
 * generate-home-manifest.mjs
 *
 * Generates frontend/lib/home/home-manifest.generated.json from the backend
 * dashboard controller. Run after adding or changing a /dashboard/* route.
 *
 *   node frontend/scripts/generate-home-manifest.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const FRONTEND_ROOT = fileURLToPath(new URL("..", import.meta.url));
const CONTROLLER_PATH = join(
  FRONTEND_ROOT,
  "..",
  "backend",
  "src",
  "modules",
  "dashboard",
  "dashboard.controller.ts",
);
const OUT_PATH = join(FRONTEND_ROOT, "lib", "home", "home-manifest.generated.json");

const source = readFileSync(CONTROLLER_PATH, "utf8");
const lines = source.split("\n");
const sections = [];

for (let i = 0; i < lines.length; i++) {
  const getMatch = /@Get\(\s*["']([^"']+)["']\s*\)/.exec(lines[i]);
  if (!getMatch) continue;

  const endpoint = `/dashboard/${getMatch[1]}`;
  let permission = null;
  let module = null;
  let universal = false;

  for (let ahead = i + 1; ahead < lines.length; ahead++) {
    const line = lines[ahead];
    if (!/^\s*@/.test(line)) break;
    const permMatch = /@RequirePermission\(\s*["']([^"']+)["']/.exec(line);
    if (permMatch) permission = permMatch[1];
    const modMatch = /@RequireModule\(\s*["']([^"']+)["']/.exec(line);
    if (modMatch) module = modMatch[1];
    if (/@Universal\(\)/.test(line)) universal = true;
  }

  sections.push({ endpoint, universal, module, permission });
}

if (sections.length < 5) {
  console.error(`✖  Only ${sections.length} routes parsed — check the controller path.`);
  process.exit(1);
}

const manifest = {
  version: 1,
  generatedFrom: "backend/src/modules/dashboard/dashboard.controller.ts",
  sections,
};

writeFileSync(OUT_PATH, JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log(`✔  Written ${sections.length} sections to ${OUT_PATH}`);
