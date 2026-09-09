import * as fs from "fs";
import { backendPath } from "@/lib/test-support/backend-path";
import { CRM_MCP_SCOPE_GROUPS, resolveCrmMcpScopes, scopeLabel } from "../mcp-scopes";

/**
 * The other half of CRM-P1-16, on the axis the backend cannot see.
 *
 * That bug was a settings page issuing a credential the server it named would
 * not accept. The backend now proves the credential itself crosses
 * (`crm-mcp-agent-token-gap.spec.ts`, `crm-mcp-agent-token.seeded-e2e-spec.ts`).
 * What neither repository can prove alone is that the *scopes* this page offers
 * still correspond to tools that exist.
 *
 * They can drift silently in both directions, and both are quiet failures
 * rather than errors:
 *
 *   - A scope group naming a key no tool requires mints a token that unlocks
 *     nothing. The page shows "Deals only", the agent gets an empty tool list,
 *     and every request involved returns 200.
 *   - A tool requiring a key no group can issue is unreachable by any token the
 *     product hands out. The tool exists, is documented on this very page, and
 *     no agent token can ever call it.
 *
 * Read out of the backend source rather than imported, because the two
 * repositories do not share a build. `backendPath` resolves by looking; the
 * `existsSync` assertion below is deliberate — a cross-repo guard that skips
 * when it cannot find its target is how five of these went vacuous before.
 */
const SERVICE_FILE = backendPath("src/modules/crm/mcp/crm-mcp.service.ts");

/** Every `requiredPermission` in the backend's MCP tool catalogue. */
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
    // If the extraction ever silently matched nothing, every set comparison
    // below would pass against an empty catalogue.
    expect(backendKeys.size).toBeGreaterThan(0);
  });

  it("offers no scope that unlocks no tool", () => {
    const offered = new Set(CRM_MCP_SCOPE_GROUPS.flatMap((group) => [...group.scopes]));
    const orphans = [...offered].filter((scope) => !backendKeys.has(scope));
    expect(orphans).toEqual([]);
  });

  it("can issue a token for every tool the server exposes", () => {
    const offered = new Set(CRM_MCP_SCOPE_GROUPS.flatMap((group) => [...group.scopes]));
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

  /**
   * `AgentTokensService.resolveCeiling` refuses any key the personal-token
   * policy bars, and answers 403 for the whole request — so a group containing
   * one would fail at creation with a message about capabilities the issuer
   * does not hold, which reads as a permissions problem rather than a product
   * one.
   */
  it("offers no scope the backend refuses to delegate to a token", () => {
    const barred = ["billing:", "ownership:", "settings:"];
    const offered = CRM_MCP_SCOPE_GROUPS.flatMap((group) => [...group.scopes]);
    const refused = offered.filter((scope) =>
      barred.some((prefix) => scope.startsWith(prefix)),
    );
    expect(refused).toEqual([]);
  });
});
