import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { DensityToggle, useDensity } from "./density-toggle";

describe("useDensity", () => {
  beforeEach(() => window.localStorage.clear());

  it("starts comfortable", () => {
    const { result } = renderHook(() => useDensity());
    expect(result.current[0]).toBe("comfortable");
  });

  it("remembers the choice across mounts, because asking again on each list is how a setting stops being used", () => {
    const first = renderHook(() => useDensity());
    act(() => first.result.current[1]("compact"));
    expect(first.result.current[0]).toBe("compact");

    const second = renderHook(() => useDensity());
    expect(second.result.current[0]).toBe("compact");
  });

  it("ignores a stored value that is not a density", () => {
    window.localStorage.setItem("streamline.density", "enormous");
    const { result } = renderHook(() => useDensity());
    expect(result.current[0]).toBe("comfortable");
  });

  it("still works when storage throws", () => {
    // A private window, cleared site data, or a browser set to block storage
    // all throw on access rather than returning nothing.
    const getItem = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const setItem = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    const { result } = renderHook(() => useDensity());
    expect(result.current[0]).toBe("comfortable");
    act(() => result.current[1]("compact"));
    // The choice still applies to this page; it just is not remembered.
    expect(result.current[0]).toBe("compact");

    getItem.mockRestore();
    setItem.mockRestore();
  });
});

describe("DensityToggle", () => {
  it("says what pressing it does, not what is currently true", () => {
    const onChange = jest.fn();
    const { rerender } = render(<DensityToggle density="comfortable" onChange={onChange} />);
    expect(screen.getByRole("button", { name: /switch to compact/i })).toBeInTheDocument();

    rerender(<DensityToggle density="compact" onChange={onChange} />);
    expect(screen.getByRole("button", { name: /switch to comfortable/i })).toBeInTheDocument();
  });

  it("reports its state to assistive technology", () => {
    render(<DensityToggle density="compact" onChange={jest.fn()} />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("toggles", () => {
    const onChange = jest.fn();
    render(<DensityToggle density="comfortable" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onChange).toHaveBeenCalledWith("compact");
  });
});
