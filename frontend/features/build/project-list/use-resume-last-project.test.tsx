import { renderHook } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { LAST_PROJECT_COOKIE_NAME } from "@/lib/projects/last-project";

let mockReadResult: {
  data: { id: number; name: string; status: string } | undefined;
  isError: boolean;
  error: ApiError | null;
};

const mockUseProject = jest.fn((
  projectId: number,
  options?: { throwOnError?: boolean },
) => {
  if (projectId > 0 && mockReadResult.error?.status === 500 && options?.throwOnError !== false)
    throw mockReadResult.error;
  return mockReadResult;
});

jest.mock("@/hooks/api/build/projects", () => ({
  useProject: (projectId: number, options?: { throwOnError?: boolean }) =>
    mockUseProject(projectId, options),
}));

import { useResumeLastProject } from "./use-resume-last-project";

beforeEach(() => {
  jest.clearAllMocks();
  document.cookie = `${LAST_PROJECT_COOKIE_NAME}=6; path=/`;
  mockReadResult = { data: undefined, isError: false, error: null };
});

afterEach(() => {
  document.cookie = `${LAST_PROJECT_COOKIE_NAME}=; path=/; max-age=0`;
});

it("keeps Projects usable when the optional last-project lookup returns a transient server error", () => {
  mockReadResult = {
    data: undefined,
    isError: true,
    error: new ApiError("Unavailable", 500, "INTERNAL_ERROR"),
  };

  expect(() => {
    const { result } = renderHook(() => useResumeLastProject());
    expect(result.current).toBeNull();
  }).not.toThrow();
  expect(document.cookie).toContain(`${LAST_PROJECT_COOKIE_NAME}=6`);
});

it.each([403, 404])("clears an inaccessible last-project reference after a %s response", (status) => {
  mockReadResult = {
    data: undefined,
    isError: true,
    error: new ApiError("Unavailable", status),
  };

  const { result } = renderHook(() => useResumeLastProject());

  expect(result.current).toBeNull();
  expect(document.cookie).not.toContain(`${LAST_PROJECT_COOKIE_NAME}=6`);
});

it("offers Resume when the last project remains active and authorized", () => {
  mockReadResult.data = { id: 6, name: "Synthetic project", status: "ACTIVE" };

  const { result } = renderHook(() => useResumeLastProject());

  expect(result.current).toMatchObject({
    ariaLabel: "Resume Synthetic project",
    href: "/build/6",
  });
});

it("clears Resume for an archived project", () => {
  mockReadResult.data = { id: 6, name: "Synthetic project", status: "ARCHIVED" };

  const { result } = renderHook(() => useResumeLastProject());

  expect(result.current).toBeNull();
  expect(document.cookie).not.toContain(`${LAST_PROJECT_COOKIE_NAME}=6`);
});
