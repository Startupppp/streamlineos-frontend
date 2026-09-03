import type { AccessResponse } from "@/types/access";
import { canManageOrganizationMembership } from "./access";

jest.mock("@/lib/api-client", () => ({ apiClient: {} }));

function accessResponse(
  overrides: Partial<AccessResponse> = {},
): AccessResponse {
  return {
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
    expect(
      canManageOrganizationMembership(
        accessResponse({
          scopes: { "settings:organization:manage": "all" },
          canManageOrganizationMembership: false,
        }),
      ),
    ).toBe(false);
  });

  it("fails closed while the access snapshot is unavailable", () => {
    expect(canManageOrganizationMembership(undefined)).toBe(false);
  });
});
