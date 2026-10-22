const mockEnforceRouteAccess = jest.fn();
const mockRedirect = jest.fn((destination: string): never => {
  throw new Error(`NEXT_REDIRECT:${destination}`);
});

jest.mock("server-only", () => ({}));
jest.mock("@/lib/rbac/route-access/enforce-route-access", () => ({
  enforceRouteAccess: (...args: unknown[]) => mockEnforceRouteAccess(...args),
}));
jest.mock("next/navigation", () => ({
  redirect: (destination: string) => mockRedirect(destination),
}));

import { GET } from "./route";

beforeEach(() => {
  jest.clearAllMocks();
  mockEnforceRouteAccess.mockResolvedValue(undefined);
});

describe("Build entry route", () => {
  it("authorizes entry before redirecting to Command Center", async () => {
    await expect(GET({ url: "http://localhost/build" } as Request)).rejects.toThrow(
      "NEXT_REDIRECT:/build/command-center",
    );
    expect(mockEnforceRouteAccess).toHaveBeenCalledWith("/build");
    expect(mockEnforceRouteAccess.mock.invocationCallOrder[0]).toBeLessThan(
      mockRedirect.mock.invocationCallOrder[0]!,
    );
  });

  it("keeps a legacy Projects creation link on the Projects page", async () => {
    await expect(
      GET({ url: "http://localhost/build?create=1" } as Request),
    ).rejects.toThrow("NEXT_REDIRECT:/build/projects?create=1");
  });

  it("preserves legacy project filters when sending an entry URL to Projects", async () => {
    await expect(
      GET({ url: "http://localhost/build?q=launch&view=list" } as Request),
    ).rejects.toThrow("NEXT_REDIRECT:/build/projects?q=launch&view=list");
  });

  it("does not redirect when Build access is denied", async () => {
    mockEnforceRouteAccess.mockRejectedValue(new Error("denied"));
    await expect(GET({ url: "http://localhost/build" } as Request)).rejects.toThrow(
      "denied",
    );
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("BT-b0a694952421 — access-needed: enforceRouteAccess is called with /build so the layout handles the module-not-enabled state", async () => {
    mockEnforceRouteAccess.mockResolvedValue(undefined);
    await expect(GET({ url: "http://localhost/build" } as Request)).rejects.toThrow(
      "NEXT_REDIRECT:",
    );
    expect(mockEnforceRouteAccess).toHaveBeenCalledWith("/build");
  });
});
