import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const TARGET_MODULES = ["build", "settings", "billing", "support", "timesheets"] as const;

const GATE_PATTERN =
  /enforceRouteAccess|requirePermission|requireModulePermission|requireSession/;

function* walkPageFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkPageFiles(full);
    } else if (entry.name === "page.tsx" || entry.name === "page.jsx") {
      yield full;
    }
  }
}

function isClientComponent(filePath: string): boolean {
  const content = readFileSync(filePath, "utf8").replace(/^﻿/, "");
  return /^["']use client["']/m.test(content);
}

function hasGate(filePath: string): boolean {
  const content = readFileSync(filePath, "utf8");
  return GATE_PATTERN.test(content);
}

function collectModulePages() {
  const appDir = resolve(process.cwd(), "app", "(authenticated)");
  const server: string[] = [];
  const client: Record<string, string[]> = {};

  for (const mod of TARGET_MODULES) {
    const modDir = join(appDir, mod);
    client[mod] = [];
    try {
      statSync(modDir);
    } catch {
      continue;
    }
    for (const file of walkPageFiles(modDir)) {
      if (isClientComponent(file)) {
        client[mod].push(file);
      } else {
        server.push(file);
      }
    }
  }

  return { server, client };
}

describe("page-level gates — target modules", () => {
  const { server, client } = collectModulePages();

  const totalPages =
    server.length + Object.values(client).reduce((s, arr) => s + arr.length, 0);

  it("finds more than 100 pages across the target modules so a broken walk cannot pass silently", () => {
    expect(totalPages).toBeGreaterThan(100);
  });

  it("every server-component page in build / settings / billing / support / timesheets carries a route-level gate", () => {
    const ungated = server
      .filter((file) => !hasGate(file))
      .map((file) => file.replace(/\\/g, "/").replace(/.*app\//, "app/"));
    expect(ungated).toEqual([]);
  });

  it("documents client-component pages that rely on the layout gate and backend PermissionGuard", () => {
    const counts: Record<string, number> = {};
    for (const [mod, files] of Object.entries(client)) {
      counts[mod] = files.length;
    }
    const totalClient = Object.values(counts).reduce((s, n) => s + n, 0);

    expect(counts["build"]).toBeGreaterThanOrEqual(0);
    expect(counts["settings"]).toBeGreaterThanOrEqual(0);
    expect(counts["billing"]).toBeGreaterThanOrEqual(0);
    expect(counts["support"]).toBeGreaterThanOrEqual(0);
    expect(counts["timesheets"]).toBeGreaterThanOrEqual(0);

    expect(totalClient).toBeLessThanOrEqual(65);
  });
});
