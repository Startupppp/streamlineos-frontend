import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TablePagination, useCursorPager } from "@/components/ui/table-pagination";

/** A keyset list shows its walk position without pretending it can jump. */
describe("TablePagination cursor mode", () => {
  const noop = () => {};

  it("renders compact cursor numbers and chevron-only controls in one responsive row", () => {
    render(<TablePagination mode="cursor" compact showLabels rowCount={25} pageNumber={3} hasMore hasPrevious onNext={noop} onPrevious={noop} />);
    const footer = screen.getByRole("navigation", { name: "Pagination" });
    expect(footer).toHaveClass("grid", "grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]");
    expect(footer.className).not.toContain("pb-[max(3.25rem");
    expect(screen.getByLabelText("Current page 3")).toHaveTextContent(/^3$/);
    expect(screen.getByLabelText("25 results shown")).toHaveTextContent(/^25$/);
    expect(screen.getByRole("button", { name: "Previous page" })).not.toHaveTextContent("Previous");
    expect(screen.getByRole("button", { name: "Next page" })).not.toHaveTextContent("Next");
    expect(screen.queryByText("Page 3")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Page 1")).not.toBeInTheDocument();
    expect(screen.queryByText(/of \d/)).not.toBeInTheDocument();
  });

  it("renders prev/next plus the current walk position, but no fake jump or total", () => {
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
    expect(screen.getByLabelText("Current page 1")).toHaveTextContent("Page 1");
    expect(screen.queryByLabelText("Page 1")).not.toBeInTheDocument();
    expect(screen.queryByText(/of \d/)).not.toBeInTheDocument();
    expect(screen.getByText("20 results shown")).toBeInTheDocument();
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

  it("marks the visible cursor position as the current page", () => {
    render(
      <TablePagination
        mode="cursor"
        rowCount={20}
        pageNumber={3}
        hasMore
        hasPrevious
        onNext={noop}
        onPrevious={noop}
      />,
    );

    expect(screen.getByLabelText("Current page 3")).toHaveAttribute(
      "aria-current",
      "page",
    );
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

describe("TablePagination load-more cursor variant", () => {
  it("reports loaded batches without offering a fake Previous page", async () => {
    const onNext = jest.fn();
    render(
      <TablePagination
        mode="cursor"
        cursorVariant="load-more"
        rowCount={40}
        pageNumber={2}
        hasMore
        onNext={onNext}
      />,
    );

    expect(screen.getByText("2 pages loaded")).toBeInTheDocument();
    expect(screen.queryByLabelText("Previous page")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("keeps a truthful completed footer after the final batch", () => {
    const onNext = jest.fn();
    render(
      <TablePagination
        mode="cursor"
        cursorVariant="load-more"
        rowCount={40}
        pageNumber={2}
        hasMore={false}
        onNext={onNext}
      />,
    );

    expect(screen.getByText("2 pages loaded")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All results loaded" })).toBeDisabled();
  });
});

describe("TablePagination cursor hideOnSinglePage option", () => {
  const noop = () => {};

  it("hides when both prev and next are exhausted and hideOnSinglePage is true", () => {
    const { container } = render(
      <TablePagination
        mode="cursor"
        rowCount={5}
        hasMore={false}
        hasPrevious={false}
        onNext={noop}
        onPrevious={noop}
        hideOnSinglePage
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("stays visible on a single page without hideOnSinglePage so existing callers are unchanged", () => {
    render(
      <TablePagination
        mode="cursor"
        rowCount={5}
        hasMore={false}
        hasPrevious={false}
        onNext={noop}
        onPrevious={noop}
      />,
    );

    expect(screen.getByLabelText("Previous page")).toBeInTheDocument();
    expect(screen.getByLabelText("Next page")).toBeInTheDocument();
  });
});

describe("TablePagination cursor navigation labels", () => {
  const noop = () => {};

  it("keeps navigation icon-only even when a legacy showLabels prop is supplied", () => {
    render(
      <TablePagination
        mode="cursor"
        rowCount={10}
        hasMore
        hasPrevious
        onNext={noop}
        onPrevious={noop}
        showLabels
      />,
    );

    expect(screen.getByLabelText("Previous page")).not.toHaveTextContent("Previous");
    expect(screen.getByLabelText("Next page")).not.toHaveTextContent("Next");
  });

  it("uses icon-only navigation for the centered pagination treatment", () => {
    render(
      <TablePagination
        mode="cursor"
        rowCount={10}
        hasMore
        hasPrevious
        onNext={noop}
        onPrevious={noop}
      />,
    );

    expect(screen.getByLabelText("Previous page")).not.toHaveTextContent("Previous");
    expect(screen.getByLabelText("Next page")).not.toHaveTextContent("Next");
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
