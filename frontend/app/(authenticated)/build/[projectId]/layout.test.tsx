import type { ReactNode } from "react";

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
let mockIsApiError = false;
jest.mock("@/lib/api-client", () => ({ isApiError: () => mockIsApiError }));
jest.mock("@/lib/prefetch/build", () => ({ prefetchBuildProject: jest.fn() }));
jest.mock("@/features/build/sidebar/remember-last-project", () => ({
  RememberLastProject: () => null,
}));
jest.mock("@/features/build/project-detail/access-denied-view", () => ({
  AccessDeniedView: () => <div data-testid="access-denied" />,
}));
jest.mock("@/features/build/project-detail/backend-unavailable-view", () => ({
  BackendUnavailableView: () => <div data-testid="backend-unavailable" />,
}));
jest.mock("@/features/build/project-detail/project-hydration-context", () => ({
  ProjectHydrationProvider: ({ children }: { children: ReactNode }) => children,
}));

import ProjectLayout from "./layout";

const { notFound } = jest.requireMock("next/navigation") as {
  notFound: jest.Mock;
};
const { prefetchBuildProject } = jest.requireMock("@/lib/prefetch/build") as {
  prefetchBuildProject: jest.Mock;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockIsApiError = false;
  prefetchBuildProject.mockResolvedValue({ project: { id: 1 }, state: {} });
});

describe("ProjectLayout", () => {
  it.each(["0", "-1"])("404s for a non-positive project id (%s)", async (projectId) => {
    await expect(
      ProjectLayout({ children: null, params: Promise.resolve({ projectId }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledTimes(1);
    expect(prefetchBuildProject).not.toHaveBeenCalled();
  });

  it("renders the not-found boundary for a missing project instead of throwing the API error", async () => {
    mockIsApiError = true;
    prefetchBuildProject.mockRejectedValue({ status: 404, code: "PROJECTS_NOT_FOUND" });

    await expect(
      ProjectLayout({ children: null, params: Promise.resolve({ projectId: "6" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it("renders the access-denied boundary for a forbidden project", async () => {
    mockIsApiError = true;
    prefetchBuildProject.mockRejectedValue({
      status: 403,
      code: "PROJECTS_FORBIDDEN_PROJECT",
      details: { reason: "NOT_A_MEMBER" },
    });

    const result = await ProjectLayout({
      children: null,
      params: Promise.resolve({ projectId: "6" }),
    });

    expect(result).toEqual(
      expect.objectContaining({
        props: expect.objectContaining({ projectName: "this project", hint: expect.any(String) }),
      }),
    );
    expect(notFound).not.toHaveBeenCalled();
  });

  it("renders a recoverable backend-unavailable state instead of crashing the shell", async () => {
    mockIsApiError = true;
    prefetchBuildProject.mockRejectedValue({ status: 503, code: "BACKEND_UNREACHABLE" });

    const result = await ProjectLayout({
      children: null,
      params: Promise.resolve({ projectId: "6" }),
    });

    expect(result).toEqual(expect.objectContaining({ props: expect.any(Object) }));
    expect(notFound).not.toHaveBeenCalled();
  });
});
