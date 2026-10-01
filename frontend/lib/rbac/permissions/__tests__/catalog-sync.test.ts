import * as fs from "fs";
import { PERMISSIONS } from "../catalog";
import {
  PERMISSION_CATALOG_PATH,
  backendPermissionNames,
  delegableModuleIds,
} from "@/test-utils/permission-catalog";

describe("permission catalog sync", () => {
  let backendNames: Set<string>;
  let backendAvailable: boolean;

  beforeAll(() => {
    try {
      backendNames = backendPermissionNames();
      backendAvailable = backendNames.size > 400;
    } catch {
      backendNames = new Set();
      backendAvailable = false;
    }
  });

  it("can reach the backend catalog — the cross-repo checks below assert nothing without it", () => {
    expect({ backendAvailable, artifact: PERMISSION_CATALOG_PATH }).toEqual({
      backendAvailable: true,
      artifact: PERMISSION_CATALOG_PATH,
    });
    expect(fs.existsSync(PERMISSION_CATALOG_PATH)).toBe(true);
  });

  it("has no duplicate permission names in the generated catalog", () => {
    const names = PERMISSIONS.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("every permission entry carries resource, action, and description", () => {
    const incomplete = PERMISSIONS.filter(
      (p) => !p.resource || !p.action || !p.description,
    ).map((p) => p.name);
    expect(incomplete).toEqual([]);
  });

  it("has no phantom keys — every generated permission exists in the backend catalog", () => {
    if (!backendAvailable) return;
    const phantoms = PERMISSIONS.map((p) => p.name).filter((name) => !backendNames.has(name));
    expect(phantoms).toEqual([]);
  });

  it("every CRM-namespace backend permission is grantable in the role editor", () => {
    if (!backendAvailable) return;
    const catalogNames = new Set(PERMISSIONS.map((p) => p.name));
    const ungrantable = [...backendNames]
      .filter((name) => name.startsWith("party:") || name.startsWith("crm:"))
      .filter((name) => !catalogNames.has(name));
    expect(ungrantable).toEqual([]);
  });

  it("every key parses into a module segment plus at least one more", () => {
    if (!backendAvailable) return;
    const unparseable = [...backendNames].filter((name) => {
      const parts = name.split(":");
      return parts.length < 2 || parts.some((segment) => segment.length === 0);
    });
    expect(unparseable).toEqual([]);
  });

  it("delegable modules each have both access:view and access:manage entries in the catalog", () => {
    if (!backendAvailable) return;
    const catalogNames = new Set(PERMISSIONS.map((p) => p.name));
    const missing = delegableModuleIds().flatMap((id) => [
      catalogNames.has(`${id}:access:view`) ? [] : [`${id}:access:view`],
      catalogNames.has(`${id}:access:manage`) ? [] : [`${id}:access:manage`],
    ]);
    expect(missing.flat()).toEqual([]);
  });
});
