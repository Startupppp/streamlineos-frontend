import { act, renderHook } from "@testing-library/react";
import type { ChangeEvent } from "react";
import { DEFAULT_DISPLAY_OPTIONS } from "./display-options-panel";
import { useBoardSavedViews } from "./use-board-saved-views";

const replace = jest.fn();
const createViewMutate = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams("status=TODO"),
}));

jest.mock("@/hooks/api/build", () => ({
  useCreateView: () => ({ mutate: createViewMutate, isPending: false }),
  useUpdateView: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

beforeEach(() => {
  replace.mockClear();
  createViewMutate.mockClear();
  window.history.replaceState({}, "", "/build/42/workload?status=TODO");
});

it("opens a newly saved workload view on the project Issues route", () => {
  const { result } = renderHook(() =>
    useBoardSavedViews({
      projectId: 42,
      view: "workload",
      activeView: null,
      filters: { status: "TODO" },
      displayOptions: DEFAULT_DISPLAY_OPTIONS,
    }),
  );

  act(() => {
    result.current.handleSaveViewNameChange({
      target: { value: "Todo workload" },
    } as ChangeEvent<HTMLInputElement>);
  });
  act(() => {
    result.current.handleSaveView();
  });

  const options = createViewMutate.mock.calls[0][1] as {
    onSuccess: (created: { id: number }) => void;
  };
  act(() => {
    options.onSuccess({ id: 9 });
  });

  expect(replace).toHaveBeenCalledWith(
    "/build/42/issues?status=TODO&viewId=9",
    { scroll: false },
  );
});
