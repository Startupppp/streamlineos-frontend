jest.mock("server-only", () => ({}));

jest.mock("@/lib/rbac/require-permission", () => ({
  requirePermission: jest.fn(),
}));

jest.mock("@/lib/prefetch/roles", () => ({
  prefetchRoles: jest.fn(),
}));

jest.mock("@/features/settings/roles/roles-page", () => ({
  RolesPage: () => null,
}));

import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchRoles } from "@/lib/prefetch/roles";
import RolesRoute from "@/app/(authenticated)/settings/roles/page";

describe("RolesRoute — permission check precedes data prefetch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not call prefetchRoles when the permission check redirects", async () => {
    const redirectError = Object.assign(new Error("NEXT_REDIRECT"), {
      digest: "NEXT_REDIRECT",
    });
    (requirePermission as jest.Mock).mockRejectedValueOnce(redirectError);

    await expect(RolesRoute()).rejects.toMatchObject({
      digest: "NEXT_REDIRECT",
    });

    expect(prefetchRoles).not.toHaveBeenCalled();
  });

  it("calls prefetchRoles only after the permission check resolves", async () => {
    (requirePermission as jest.Mock).mockResolvedValueOnce(undefined);
    (prefetchRoles as jest.Mock).mockResolvedValueOnce({
      queries: [],
      mutations: [],
    });

    await RolesRoute();

    expect(requirePermission).toHaveBeenCalledWith("settings:rbac:manage");
    expect(prefetchRoles).toHaveBeenCalledTimes(1);
  });
});
