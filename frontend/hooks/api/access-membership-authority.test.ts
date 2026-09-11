import type { AccessResponse } from "@/types/access";
import { canManageOrganizationMembership } from "./access";

jest.mock("@/lib/api-client", () => ({ apiClient: {} }));

/**
 * `scopes`, not `permissions`. The fixture used to carry a `permissions` array,
 * which `AccessResponse` has never had and `canManageOrganizationMembership`
 * therefore could not read — so the "does not infer authority" case below put
 * its permission somewhere nothing looks, and passed for that reason rather
 * than because the capability is structural. Held on the real surface it bites.
 */
function accessResponse(
  overrides: Partial<AccessResponse> = {},
): AccessResponse {
  return {
    /*
     * `scopes`, because that is the field `AccessResponse` actually has and the
     * one `usePermissionGate` reads — a held permission is a KEY in it
     * (`permission in data.scopes`).
     *
     * This fixture said `permissions: []` and passed `permissions: [...]` in the
     * case below. No such field exists on the type, and nothing reads it, so the
     * permission the test claimed to grant was never represented in any shape the
     * code could see. The suite could not catch that because this branch's
     * tsconfig excludes test files and there is no `type-check:specs` script, so
     * no typecheck ever looked at this file.
     */
    scopes: {},
    isOrgOwner: false,
    canManageOrganizationMembership: false,
    modules: {},
    ...overrides,
  };
}

describe("organization membership capability", () => {
  it("uses the backend-derived structural capability", () => {
    expect(
      canManageOrganizationMembership(
        accessResponse({ canManageOrganizationMembership: true }),
      ),
    ).toBe(true);
  });

  it("does not infer authority from a custom settings permission", () => {
    /*
     * The grant is now in `scopes`, which is where a real one lands, so the
     * assertion has something to bite on. Previously the `false` came entirely
     * from the `canManageOrganizationMembership: false` passed alongside it — the
     * permission was inert, and this case would have gone on passing if the
     * function had started consulting scopes, which is the single thing it
     * exists to forbid.
     */
    expect(
      canManageOrganizationMembership(
        accessResponse({
          scopes: { "settings:organization:manage": "all" },
          canManageOrganizationMembership: false,
        }),
      ),
    ).toBe(false);
  });

  it("still refuses when the settings permission is the ONLY thing held", () => {
    /*
     * Without the boolean beside it, so nothing but the scope is present. This is
     * the case the old test was meant to be: if authority were ever inferred from
     * a permission key, this is where it would show.
     */
    expect(
      canManageOrganizationMembership(
        accessResponse({ scopes: { "settings:organization:manage": "all" } }),
      ),
    ).toBe(false);
  });

  it("fails closed while the access snapshot is unavailable", () => {
    expect(canManageOrganizationMembership(undefined)).toBe(false);
  });
});
