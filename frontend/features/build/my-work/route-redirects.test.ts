const mockRedirect = jest.fn();
const mockEnforceRouteAccess = jest.fn().mockResolvedValue(undefined);

jest.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}));

jest.mock("@/lib/rbac/route-access/enforce-route-access", () => ({
  enforceRouteAccess: (...args: unknown[]) => mockEnforceRouteAccess(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockEnforceRouteAccess.mockResolvedValue(undefined);
});

describe("workspace my-work route — redirects to canonical URL", () => {
  it("redirects to /build/my-work?pmWorkspaceId=... after access check", async () => {
    const { default: MyWorkRoute } = await import(
      "../../../app/(authenticated)/build/workspaces/[pmWorkspaceId]/my-work/page"
    );

    await MyWorkRoute({
      params: Promise.resolve({ pmWorkspaceId: "ws-abc" }),
    });

    expect(mockEnforceRouteAccess).toHaveBeenCalledWith(
      "/build/workspaces/[pmWorkspaceId]/my-work",
    );
    expect(mockRedirect).toHaveBeenCalledWith(
      "/build/my-work?pmWorkspaceId=ws-abc",
    );
  });

  it("URL-encodes the pmWorkspaceId so special characters survive the redirect", async () => {
    const { default: MyWorkRoute } = await import(
      "../../../app/(authenticated)/build/workspaces/[pmWorkspaceId]/my-work/page"
    );

    await MyWorkRoute({
      params: Promise.resolve({ pmWorkspaceId: "ws/special chars" }),
    });

    expect(mockRedirect).toHaveBeenCalledWith(
      "/build/my-work?pmWorkspaceId=ws%2Fspecial%20chars",
    );
  });
});

describe("project my-tickets route — redirects to canonical URL", () => {
  it("redirects to /build/my-work?projectId=... after access check", async () => {
    jest.resetModules();
    jest.mock("next/navigation", () => ({
      redirect: (...args: unknown[]) => mockRedirect(...args),
    }));
    jest.mock("@/lib/rbac/route-access/enforce-route-access", () => ({
      enforceRouteAccess: (...args: unknown[]) =>
        mockEnforceRouteAccess(...args),
    }));

    const { default: TicketsPage } = await import(
      "../../../app/(authenticated)/build/[projectId]/my-tickets/page"
    );

    await TicketsPage({
      params: Promise.resolve({ projectId: "42" }),
    });

    expect(mockEnforceRouteAccess).toHaveBeenCalledWith(
      "/build/[projectId]/my-tickets",
    );
    expect(mockRedirect).toHaveBeenCalledWith("/build/my-work?projectId=42");
  });
});
