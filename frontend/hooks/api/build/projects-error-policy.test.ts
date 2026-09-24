jest.mock("@tanstack/react-query", () => ({
  ...jest.requireActual("@tanstack/react-query"),
  useQuery: jest.fn(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
}));

jest.mock("@/features/build/project-detail/project-hydration-context", () => ({
  useHydratedProject: jest.fn(),
}));

import { useQuery } from "@tanstack/react-query";
import type { Query } from "@tanstack/react-query";
import { ApiError } from "@/lib/api-envelope";
import { useCan } from "@/hooks/api/access";
import { useHydratedProject } from "@/features/build/project-detail/project-hydration-context";
import { useProject } from "./projects";

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockUseCan = useCan as jest.MockedFunction<typeof useCan>;
const mockUseHydratedProject = useHydratedProject as jest.MockedFunction<typeof useHydratedProject>;

describe("useProject error boundary policy", () => {
  beforeEach(() => {
    mockUseCan.mockReturnValue(true);
    mockUseHydratedProject.mockReturnValue(undefined);
    mockUseQuery.mockReturnValue({} as ReturnType<typeof useQuery>);
  });

  it("does not throw a missing project from shared shell consumers", () => {
    useProject(5);

    const options = mockUseQuery.mock.calls.at(-1)?.[0];
    expect(options?.throwOnError).toBeDefined();
    expect(
      typeof options?.throwOnError === "function" &&
        options.throwOnError(
          new ApiError("Project not found", 404, "PROJECTS_NOT_FOUND"),
          { state: { data: undefined } } as unknown as Query<unknown, unknown>,
        ),
    ).toBe(false);
  });
});
