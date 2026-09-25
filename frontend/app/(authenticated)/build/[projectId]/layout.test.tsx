import type { ReactNode } from "react";

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
jest.mock("@/lib/api-client", () => ({ isApiError: () => false }));
jest.mock("@/lib/prefetch/build", () => ({ prefetchBuildProject: jest.fn() }));
jest.mock("@/features/build/sidebar/remember-last-project", () => ({
  RememberLastProject: () => null,
}));
jest.mock("@/features/build/project-detail/access-denied-view", () => ({
  AccessDeniedView: () => null,
}));
jest.mock("@/features/build/project-detail/backend-unavailable-view", () => ({
  BackendUnavailableView: () => null,
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
});
