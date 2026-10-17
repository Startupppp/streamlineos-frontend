import { act, renderHook } from "@testing-library/react";
import { useQueryParamOpen } from "./use-query-param-open";

const replace = jest.fn();
let query = new URLSearchParams("create=1");

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/build/managed-products/39/goals",
  useSearchParams: () => query,
}));

describe("useQueryParamOpen", () => {
  beforeEach(() => {
    replace.mockClear();
    query = new URLSearchParams("create=1");
  });

  it("closes immediately after a save while URL navigation is still pending", () => {
    const { result, rerender } = renderHook(() => useQueryParamOpen("create"));
    expect(result.current.open).toBe(true);

    act(() => result.current.onOpenChange(false));
    expect(result.current.open).toBe(false);
    expect(replace).toHaveBeenCalledWith("/build/managed-products/39/goals", { scroll: false });

    query = new URLSearchParams();
    rerender();
    expect(result.current.open).toBe(false);
    query = new URLSearchParams("create=1");
    rerender();
    expect(result.current.open).toBe(true);
    act(() => result.current.setOpen());
    expect(result.current.open).toBe(true);
  });
});
