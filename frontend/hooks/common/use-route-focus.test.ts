import { renderHook } from "@testing-library/react";
import { useRouteFocus } from "./use-route-focus";

const mockUsePathname = jest.fn<string, []>();

jest.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

describe("useRouteFocus", () => {
  let target: HTMLElement;

  beforeEach(() => {
    target = document.createElement("main");
    target.id = "dashboard-content";
    document.body.appendChild(target);
    target.focus = jest.fn();
    mockUsePathname.mockReturnValue("/initial");
  });

  afterEach(() => {
    document.body.removeChild(target);
    jest.clearAllMocks();
  });

  it("does not focus on the initial render", () => {
    renderHook(() => useRouteFocus());
    expect(target.focus).not.toHaveBeenCalled();
  });

  it("moves focus to the target on pathname change", () => {
    const { rerender } = renderHook(() => useRouteFocus());

    mockUsePathname.mockReturnValue("/next-route");
    rerender();

    expect(target.focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("sets tabindex=-1 when the target lacks one", () => {
    const { rerender } = renderHook(() => useRouteFocus());

    mockUsePathname.mockReturnValue("/another-route");
    rerender();

    expect(target.getAttribute("tabindex")).toBe("-1");
  });
});
