import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TablePagination, useCursorPager } from "@/components/ui/table-pagination";

/**
 * A keyset list has no total and no page index. The risk is not that the
 * footer looks wrong — it is that someone reintroduces a number by inferring
 * one from the page length, which reads as "312 records" when it means "20 on
 * screen". These assertions pin the absence.
 */
describe("TablePagination cursor mode", () => {
  const noop = () => {};

  it("renders prev/next only — no page numbers and no total", () => {
    render(
      <TablePagination
        mode="cursor"
        rowCount={20}
        hasMore
        hasPrevious
        onNext={noop}
        onPrevious={noop}
      />,
    );

    expect(screen.getByLabelText("Previous page")).toBeInTheDocument();
    expect(screen.getByLabelText("Next page")).toBeInTheDocument();
    expect(screen.queryByLabelText("Page 1")).not.toBeInTheDocument();
    expect(screen.queryByText(/of \d/)).not.toBeInTheDocument();
    expect(screen.getByText("20 results on this page")).toBeInTheDocument();
  });

  it("disables next at the end of the list and previous at the head", () => {
    render(
      <TablePagination
        mode="cursor"
        rowCount={3}
        hasMore={false}
        hasPrevious={false}
        onNext={noop}
        onPrevious={noop}
      />,
    );

    expect(screen.getByLabelText("Next page")).toBeDisabled();
    expect(screen.getByLabelText("Previous page")).toBeDisabled();
  });

  it("still renders numbered pages in offset mode", () => {
    render(
      <TablePagination page={2} pageSize={10} total={35} onPageChange={noop} />,
    );

    expect(screen.getByLabelText("Page 1")).toBeInTheDocument();
    expect(screen.getByText("Showing 11–20 of 35")).toBeInTheDocument();
  });

  it("calls the handlers the caller supplied", async () => {
    const onNext = jest.fn();
    const onPrevious = jest.fn();
    render(
      <TablePagination
        mode="cursor"
        rowCount={20}
        hasMore
        hasPrevious
        onNext={onNext}
        onPrevious={onPrevious}
      />,
    );

    await userEvent.click(screen.getByLabelText("Next page"));
    await userEvent.click(screen.getByLabelText("Previous page"));

    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrevious).toHaveBeenCalledTimes(1);
  });
});

describe("useCursorPager", () => {
  it("starts at the head with no previous page", () => {
    const { result } = renderHook(() => useCursorPager());

    expect(result.current.cursor).toBeUndefined();
    expect(result.current.hasPrevious).toBe(false);
  });

  it("walks forward and back through the stack it recorded", () => {
    const { result } = renderHook(() => useCursorPager());

    act(() => result.current.goNext("c1"));
    expect(result.current.cursor).toBe("c1");
    expect(result.current.hasPrevious).toBe(true);

    act(() => result.current.goNext("c2"));
    expect(result.current.cursor).toBe("c2");

    act(() => result.current.goPrevious());
    expect(result.current.cursor).toBe("c1");

    act(() => result.current.goPrevious());
    expect(result.current.cursor).toBeUndefined();
    expect(result.current.hasPrevious).toBe(false);
  });

  it("ignores a null next cursor rather than pushing a dead page", () => {
    const { result } = renderHook(() => useCursorPager());

    act(() => result.current.goNext(null));

    expect(result.current.cursor).toBeUndefined();
    expect(result.current.hasPrevious).toBe(false);
  });

  /**
   * A cursor is only valid for the query that minted it. Replaying page two's
   * cursor after the filters changed returns a window from a different result
   * set, so the stack must rewind before the next request goes out.
   */
  it("rewinds to the head when the reset key changes", () => {
    const { result, rerender } = renderHook(
      ({ key }: { key: string }) => useCursorPager(key),
      { initialProps: { key: "status=OPEN" } },
    );

    act(() => result.current.goNext("c1"));
    expect(result.current.cursor).toBe("c1");

    rerender({ key: "status=CLOSED" });

    expect(result.current.cursor).toBeUndefined();
    expect(result.current.hasPrevious).toBe(false);
  });

  it("does not rewind while the reset key is unchanged", () => {
    const { result, rerender } = renderHook(
      ({ key }: { key: string }) => useCursorPager(key),
      { initialProps: { key: "status=OPEN" } },
    );

    act(() => result.current.goNext("c1"));
    rerender({ key: "status=OPEN" });

    expect(result.current.cursor).toBe("c1");
  });
});
