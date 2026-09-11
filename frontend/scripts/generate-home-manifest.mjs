/**
 * generate-home-manifest.mjs
 *
 * Generates frontend/lib/home/home-manifest.generated.json from the backend
 * dashboard controller plus the declared external Home routes. Run after
 * adding or changing a Home route.
 *
 *   node frontend/scripts/generate-home-manifest.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseControllerRoutes,
  parseExternalHomeRoutes,
} from "./home-manifest-parse.mjs";
import {
  BACKEND_ROOT,
  backendAvailable,
  backendUnreachableReason,
} from "./check-repo-paths.mjs";

const FRONTEND_ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT_PATH = join(FRONTEND_ROOT, "lib", "home", "home-manifest.generated.json");

// Found by marker, not by relative depth: `<frontend>/../backend` does not
// exist on a sibling checkout, and the miss crashed the generator with ENOENT
// while check-home-manifest kept telling people to run it.
if (!backendAvailable) {
  console.error(`\u2716  Cannot generate the Home manifest: ${backendUnreachableReason()}`);
  process.exit(1);
}

const BACKEND_SRC = join(BACKEND_ROOT, "src");
const CONTROLLER_PATH = join(
  BACKEND_SRC,
  "modules",
  "dashboard",
  "dashboard.controller.ts",
);

const dashboardRoutes = parseControllerRoutes(readFileSync(CONTROLLER_PATH, "utf8"));
const externalRoutes = parseExternalHomeRoutes(BACKEND_SRC);

const sections = [...dashboardRoutes, ...externalRoutes].map(
  ([endpoint, access]) => ({
    endpoint,
    universal: access.universal,
    module: access.module,
    permission: access.permission,
  }),
);

if (sections.length < 5) {
  console.error(`✖  Only ${sections.length} routes parsed — check the controller path.`);
  process.exit(1);
}

const manifest = {
  version: 1,
  generatedFrom:
    "backend/src/modules/dashboard/dashboard.controller.ts + declared external Home routes",
  sections,
};

writeFileSync(OUT_PATH, JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log(`✔  Written ${sections.length} sections to ${OUT_PATH}`);
