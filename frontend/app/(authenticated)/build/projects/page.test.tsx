const mockEnforceRouteAccess = jest.fn();

jest.mock("server-only", () => ({}));
jest.mock("@/lib/rbac/route-access/enforce-route-access", () => ({
  enforceRouteAccess: (...args: unknown[]) => mockEnforceRouteAccess(...args),
}));
jest.mock("@/features/build/project-list/projects-page", () => ({
  ProjectsPage: () => null,
}));

import ProjectsRoute from "./page";

beforeEach(() => {
  jest.clearAllMocks();
  mockEnforceRouteAccess.mockResolvedValue(undefined);
});

describe("Projects route", () => {
  it("uses the dedicated Projects permission gate", async () => {
    await ProjectsRoute();
    expect(mockEnforceRouteAccess).toHaveBeenCalledWith("/build/projects");
  });

  it("does not render when Build access is denied", async () => {
    mockEnforceRouteAccess.mockRejectedValue(new Error("denied"));
    await expect(ProjectsRoute()).rejects.toThrow("denied");
  });
});
