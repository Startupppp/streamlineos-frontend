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

import BuildRoute from "./page";

beforeEach(() => {
  jest.clearAllMocks();
  mockEnforceRouteAccess.mockResolvedValue(undefined);
});

describe("Build entry route", () => {
  it("authorizes entry before redirecting to Command Center", async () => {
    await expect(BuildRoute({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      "NEXT_REDIRECT:/build/command-center",
    );
    expect(mockEnforceRouteAccess).toHaveBeenCalledWith("/build");
    expect(mockEnforceRouteAccess.mock.invocationCallOrder[0]).toBeLessThan(
      mockRedirect.mock.invocationCallOrder[0]!,
    );
  });

  it("keeps a legacy Projects creation link on the Projects page", async () => {
    await expect(
      BuildRoute({ searchParams: Promise.resolve({ create: "1" }) }),
    ).rejects.toThrow("NEXT_REDIRECT:/build/projects?create=1");
  });

  it("does not redirect when Build access is denied", async () => {
    mockEnforceRouteAccess.mockRejectedValue(new Error("denied"));
    await expect(BuildRoute({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      "denied",
    );
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
