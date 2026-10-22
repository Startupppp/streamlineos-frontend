import * as fs from "fs";
import { backendPath } from "@/lib/test-support/backend-path";
import { CRM_MCP_SCOPE_GROUPS, resolveCrmMcpScopes, scopeLabel } from "../mcp-scopes";

const SERVICE_FILE = backendPath("src/modules/crm/mcp/lib/crm-mcp-tool-catalogue.ts");

function toolPermissions(source: string): Set<string> {
  const catalogue = new Set<string>();
  for (const [, key] of source.matchAll(/requiredPermission:\s*"([^"]+)"/g)) {
    catalogue.add(key);
  }
  return catalogue;
}

describe("CRM MCP scope groups stay in step with the backend tool catalogue", () => {
  let backendKeys: Set<string>;

  beforeAll(() => {
    expect(fs.existsSync(SERVICE_FILE)).toBe(true);
    backendKeys = toolPermissions(fs.readFileSync(SERVICE_FILE, "utf8"));
    expect(backendKeys.size).toBeGreaterThan(0);
  });

  it("offers no scope that unlocks no tool", () => {
    const offered = new Set(CRM_MCP_SCOPE_GROUPS.flatMap((group) => [...group.scopes]));
    const orphans = [...offered].filter((scope) => !backendKeys.has(scope));
    expect(orphans).toEqual([]);
  });

  it("can issue a token for every tool the server exposes", () => {
    const offered = new Set<string>(CRM_MCP_SCOPE_GROUPS.flatMap((group) => [...group.scopes]));
    const unreachable = [...backendKeys].filter((key) => !offered.has(key));
    expect(unreachable).toEqual([]);
  });

  it("labels every scope it can issue, so no token renders a raw permission key", () => {
    const offered = new Set(CRM_MCP_SCOPE_GROUPS.flatMap((group) => [...group.scopes]));
    const unlabelled = [...offered].filter((scope) => scopeLabel(scope) === scope);
    expect(unlabelled).toEqual([]);
  });

  it("resolves every group to a non-empty scope list", () => {
    for (const group of CRM_MCP_SCOPE_GROUPS) {
      expect(resolveCrmMcpScopes(group.value).length).toBeGreaterThan(0);
    }
  });

  it("offers no scope the backend refuses to delegate to a token", () => {
    const barred = ["billing:", "ownership:", "settings:"];
    const offered = CRM_MCP_SCOPE_GROUPS.flatMap((group) => [...group.scopes]);
    const refused = offered.filter((scope) =>
      barred.some((prefix) => scope.startsWith(prefix)),
    );
    expect(refused).toEqual([]);
  });
});
