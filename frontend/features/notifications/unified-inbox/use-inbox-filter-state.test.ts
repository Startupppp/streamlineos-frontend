import { renderHook, act } from "@testing-library/react";
import { useInboxFilterState } from "./use-inbox-filter-state";

type Router = { replace: jest.Mock };

function makeRouter(): Router {
  return { replace: jest.fn<void, [string, { scroll: boolean }]>() };
}

describe("useInboxFilterState — initial URL sync", () => {
  it("serialises view=primary into the URL on first render", () => {
    const router = makeRouter();
    renderHook(() => useInboxFilterState(new URLSearchParams(), router));

    expect(router.replace).toHaveBeenCalledTimes(1);
    const [url] = router.replace.mock.calls[0] as [string, { scroll: boolean }];
    expect(url).toContain("view=primary");
  });

  it("passes scroll:false so the browser does not jump to the top", () => {
    const router = makeRouter();
    renderHook(() => useInboxFilterState(new URLSearchParams(), router));

    const [, opts] = router.replace.mock.calls[0] as [string, { scroll: boolean }];
    expect(opts.scroll).toBe(false);
  });
});

describe("useInboxFilterState — router reference stability", () => {
  it("a new router object identity after the initial sync does not trigger a second replace call for the same filter state", async () => {
    const router1 = makeRouter();
    const router2 = makeRouter();

    const { rerender } = renderHook(
      ({ router }: { router: Router }) =>
        useInboxFilterState(new URLSearchParams(), router),
      { initialProps: { router: router1 } },
    );

    await act(async () => {});

    expect(router1.replace).toHaveBeenCalledTimes(1);

    rerender({ router: router2 });

    await act(async () => {});

    expect(router2.replace).not.toHaveBeenCalled();
  });
});
