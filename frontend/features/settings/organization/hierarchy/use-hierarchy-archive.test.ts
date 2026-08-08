import { act, renderHook } from "@testing-library/react";
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
  it("retains the target and error when archive is dependency-blocked", () => {
    let callbacks: TestArchiveCallbacks | undefined;
    const archive = jest.fn(
      (_target: TestArchiveTarget, nextCallbacks: TestArchiveCallbacks) => {
        callbacks = nextCallbacks;
      },
    );
    const target = { id: "branch-1", name: "North" };
    const dependencyError = new Error("Still in use");
    const { result } = renderHook(() =>
      useHierarchyArchive({ archive, successMessage: "Branch archived" }),
    );

    act(() => result.current.requestArchive(target));
    act(() => result.current.confirmArchive());
    act(() => callbacks?.onError(dependencyError));

    expect(result.current.target).toEqual(target);
    expect(result.current.error).toBe(dependencyError);
  });

  it("closes only after archive succeeds", () => {
    let callbacks: TestArchiveCallbacks | undefined;
    const archive = jest.fn(
      (_target: TestArchiveTarget, nextCallbacks: TestArchiveCallbacks) => {
        callbacks = nextCallbacks;
      },
    );
    const onArchived = jest.fn();
    const { result } = renderHook(() =>
      useHierarchyArchive({
        archive,
        successMessage: "Branch archived",
        onArchived,
      }),
    );

    act(() => result.current.requestArchive({ id: "branch-1", name: "North" }));
    act(() => result.current.confirmArchive());

    expect(result.current.target).not.toBeNull();

    act(() => callbacks?.onSuccess());

    expect(result.current.target).toBeNull();
    expect(result.current.error).toBeNull();
    expect(onArchived).toHaveBeenCalledTimes(1);
  });
});
