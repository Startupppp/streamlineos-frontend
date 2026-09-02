import * as fs from "fs";
import * as path from "path";
import { OWNER_ONLY_OPERATIONS } from "../owner-only-operations";
import { backendPath } from "@/test-utils/backend-repo";

const BACKEND_FILE = backendPath("src", "common", "rbac", "owner-only-operations.ts");

function extractBackendEntries(source: string): Map<string, string> {
  const result = new Map<string, string>();
  const pattern = /"([^"]+)":\s*\{[^}]*?reason:\s*"([^"]+)"/gs;
  for (const [, id, reason] of source.matchAll(pattern)) {
    result.set(id, reason);
  }
  return result;
}

describe("owner-only-operations catalog sync", () => {
  let backendEntries: Map<string, string>;

  beforeAll(() => {
    expect(fs.existsSync(BACKEND_FILE)).toBe(true);
    backendEntries = extractBackendEntries(fs.readFileSync(BACKEND_FILE, "utf8"));
  });

  it("frontend has no ids absent from the backend", () => {
    const frontendIds = new Set(Object.keys(OWNER_ONLY_OPERATIONS));
    const extra = [...frontendIds].filter((id) => !backendEntries.has(id));
    expect(extra).toEqual([]);
  });

  it("backend has no ids absent from the frontend", () => {
    const frontendIds = new Set(Object.keys(OWNER_ONLY_OPERATIONS));
    const extra = [...backendEntries.keys()].filter((id) => !frontendIds.has(id));
    expect(extra).toEqual([]);
  });

  it("every shared id has an identical reason string", () => {
    const mismatches: Array<{ id: string; frontend: string; backend: string }> = [];
    for (const id of Object.keys(OWNER_ONLY_OPERATIONS) as Array<keyof typeof OWNER_ONLY_OPERATIONS>) {
      if (!backendEntries.has(id)) continue;
      const frontendReason = OWNER_ONLY_OPERATIONS[id].reason;
      const backendReason = backendEntries.get(id)!;
      if (frontendReason !== backendReason)
        mismatches.push({ id, frontend: frontendReason, backend: backendReason });
    }
    expect(mismatches).toEqual([]);
  });
});
