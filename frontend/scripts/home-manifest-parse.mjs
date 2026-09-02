/**
 * Shared parser for the Home access manifest.
 *
 * The backend owns Home access. Most sections come from the dashboard
 * controller; a few are served by another module's controller and are declared
 * in EXTERNAL_HOME_ROUTES so their access is generated too, never hand-written.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

export const EXTERNAL_HOME_ROUTES = [
  {
    endpoint: "/hr/documents",
    controller: ["modules", "hr", "performance", "documents.controller.ts"],
    route: "documents",
  },
];

function classDefaults(lines) {
  const classIndex = lines.findIndex((line) =>
    /^export\s+(abstract\s+)?class\s/.test(line),
  );
  const end = classIndex === -1 ? lines.length : classIndex;
  let moduleKey = null;
  let permission = null;
  let universal = false;
  for (let i = 0; i < end; i++) {
    const moduleMatch = /@RequireModule\(\s*["']([^"']+)["']/.exec(lines[i]);
    if (moduleMatch) moduleKey = moduleMatch[1];
    const permissionMatch = /@RequirePermission\(\s*["']([^"']+)["']/.exec(lines[i]);
    if (permissionMatch) permission = permissionMatch[1];
    if (/@Universal\(\)/.test(lines[i])) universal = true;
  }
  return { module: moduleKey, permission, universal };
}

function handlerAccess(lines, startIndex, defaults) {
  let permission = null;
  let moduleKey = null;
  let universal = false;
  for (let i = startIndex + 1; i < lines.length; i++) {
    if (!/^\s*@/.test(lines[i])) break;
    const permissionMatch = /@RequirePermission\(\s*["']([^"']+)["']/.exec(lines[i]);
    if (permissionMatch) permission = permissionMatch[1];
    const moduleMatch = /@RequireModule\(\s*["']([^"']+)["']/.exec(lines[i]);
    if (moduleMatch) moduleKey = moduleMatch[1];
    if (/@Universal\(\)/.test(lines[i])) universal = true;
  }
  return {
    universal: universal || defaults.universal,
    module: moduleKey ?? defaults.module,
    permission: permission ?? defaults.permission,
  };
}

/** Parse GET routes from the dashboard controller into endpoint → access. */
export function parseControllerRoutes(source) {
  const routes = new Map();
  const lines = source.split("\n");
  const defaults = { module: null, permission: null, universal: false };

  for (let i = 0; i < lines.length; i++) {
    const getMatch = /@Get\(\s*["']([^"']+)["']\s*\)/.exec(lines[i]);
    if (!getMatch) continue;
    routes.set(`/dashboard/${getMatch[1]}`, handlerAccess(lines, i, defaults));
  }

  return routes;
}

/** Parse one declared route out of a controller that lives outside Dashboard. */
export function parseExternalRoute(source, routePath) {
  const lines = source.split("\n");
  const defaults = classDefaults(lines);
  for (let i = 0; i < lines.length; i++) {
    const getMatch = /@Get\(\s*["']([^"']+)["']\s*\)/.exec(lines[i]);
    if (!getMatch || getMatch[1] !== routePath) continue;
    return handlerAccess(lines, i, defaults);
  }
  return null;
}

/** Resolve every declared external Home route against the backend source. */
export function parseExternalHomeRoutes(backendSrcRoot) {
  const routes = new Map();
  for (const declared of EXTERNAL_HOME_ROUTES) {
    const path = join(backendSrcRoot, ...declared.controller);
    const access = parseExternalRoute(readFileSync(path, "utf8"), declared.route);
    if (!access) {
      throw new Error(
        `Home manifest: declared external route "${declared.endpoint}" was not found in ${path}`,
      );
    }
    routes.set(declared.endpoint, access);
  }
  return routes;
}
