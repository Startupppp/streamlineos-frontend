import { act, renderHook } from "@testing-library/react";
import { useGuardedCreateKbPage } from "./use-guarded-create-kb-page";

const mutate = jest.fn();

jest.mock("@/hooks/api/kb", () => ({
  useCreateKbPage: () => ({ mutate, isPending: false }),
}));

jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));

interface MutateHandlers {
  onSuccess: (page: { id: number }) => void;
  onSettled: () => void;
}

function handlersOfCall(index: number): MutateHandlers {
  const handlers: unknown = mutate.mock.calls[index]?.[1];
  if (typeof handlers !== "object" || handlers === null) throw new Error("no handlers");
  return handlers as MutateHandlers;
}

describe("useGuardedCreateKbPage", () => {
  beforeEach(() => mutate.mockReset());

  it("sends one create for a double-click, because the guard closes before the button re-renders", () => {
    const onCreated = jest.fn();
    const { result } = renderHook(() => useGuardedCreateKbPage(onCreated));

    act(() => {
      void result.current.submit({});
      void result.current.submit({});
    });

    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it("allows the next create once the first settles, and hands the created page to the caller", async () => {
    const onCreated = jest.fn();
    const { result } = renderHook(() => useGuardedCreateKbPage(onCreated));

    act(() => {
      void result.current.submit({});
    });
    await act(async () => {
      handlersOfCall(0).onSuccess({ id: 9 });
      handlersOfCall(0).onSettled();
    });
    act(() => {
      void result.current.submit({});
    });

    expect(onCreated).toHaveBeenCalledWith({ id: 9 });
    expect(mutate).toHaveBeenCalledTimes(2);
  });
});
