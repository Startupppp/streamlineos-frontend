import { act, renderHook, waitFor } from "@testing-library/react";
import { useHierarchyArchive } from "./use-hierarchy-archive";

jest.mock("sonner", () => ({
  toast: { success: jest.fn() },
}));

type TestArchiveCallbacks = {
  onSuccess: () => void;
  onError: (error: unknown) => void;
};

type TestArchiveTarget = { id: string; name: string };

describe("useHierarchyArchive", () => {
  const emptyPreview = {
    unitId: "branch-1",
    unitKind: "BRANCH" as const,
    mode: "archive" as const,
    dependencies: [],
    totalDependencies: 0,
  };

  it("retains the target and error when the mutation finds a new dependency", async () => {
    let callbacks: TestArchiveCallbacks | undefined;
    const archive = jest.fn(
      (_target: TestArchiveTarget, nextCallbacks: TestArchiveCallbacks) => {
        callbacks = nextCallbacks;
      },
    );
    const target = { id: "branch-1", name: "North" };
    const dependencyError = new Error("Still in use");
    const { result } = renderHook(() =>
      useHierarchyArchive({
        unitKind: "BRANCH",
        archive,
        successMessage: "Branch archived",
        loadDependencies: jest.fn().mockResolvedValue(emptyPreview),
      }),
    );

    act(() => result.current.requestArchive(target));
    await waitFor(() => expect(result.current.isChecking).toBe(false));
    act(() => result.current.confirmArchive());
    act(() => callbacks?.onError(dependencyError));

    expect(result.current.target).toEqual(target);
    expect(result.current.error).toBe(dependencyError);
  });

  it("closes only after archive succeeds", async () => {
    let callbacks: TestArchiveCallbacks | undefined;
    const archive = jest.fn(
      (_target: TestArchiveTarget, nextCallbacks: TestArchiveCallbacks) => {
        callbacks = nextCallbacks;
      },
    );
    const onArchived = jest.fn();
    const { result } = renderHook(() =>
      useHierarchyArchive({
        unitKind: "BRANCH",
        archive,
        successMessage: "Branch archived",
        onArchived,
        loadDependencies: jest.fn().mockResolvedValue(emptyPreview),
      }),
    );

    act(() => result.current.requestArchive({ id: "branch-1", name: "North" }));
    await waitFor(() => expect(result.current.isChecking).toBe(false));
    act(() => result.current.confirmArchive());

    expect(result.current.target).not.toBeNull();

    act(() => callbacks?.onSuccess());

    expect(result.current.target).toBeNull();
    expect(result.current.error).toBeNull();
    expect(onArchived).toHaveBeenCalledTimes(1);
  });

  it("shows preflight dependencies and never starts the archive mutation", async () => {
    const archive = jest.fn();
    const { result } = renderHook(() =>
      useHierarchyArchive({
        unitKind: "BRANCH",
        archive,
        successMessage: "Branch archived",
        loadDependencies: jest.fn().mockResolvedValue({
          ...emptyPreview,
          dependencies: [
            { key: "workers", label: "Current workers", count: 2 },
          ],
          totalDependencies: 2,
        }),
      }),
    );

    act(() => result.current.requestArchive({ id: "branch-1", name: "North" }));
    await waitFor(() => expect(result.current.isChecking).toBe(false));
    act(() => result.current.confirmArchive());

    expect(result.current.dependencies).toEqual([
      { key: "workers", label: "Current workers", count: 2 },
    ]);
    expect(archive).not.toHaveBeenCalled();
  });
});
