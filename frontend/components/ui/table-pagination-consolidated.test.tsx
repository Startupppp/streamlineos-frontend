import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TablePagination } from "@/components/ui/table-pagination";

const noop = () => {};

describe("TablePagination absorbs the second footer, so there is one pagination module", () => {
  it("renders no page-size control when the caller supplies no handler, which is what the 61 existing call sites pass", () => {
    render(<TablePagination page={1} pageSize={10} total={35} onPageChange={noop} />);

    expect(screen.queryByLabelText("Rows per page")).not.toBeInTheDocument();
  });

  it("renders no first/last jump when the caller does not ask for one, so the existing footers are unchanged", () => {
    render(<TablePagination page={2} pageSize={10} total={35} onPageChange={noop} />);

    expect(screen.queryByLabelText("First page")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Last page")).not.toBeInTheDocument();
  });

  it("offers a page-size control in offset mode once a handler is supplied", () => {
    render(
      <TablePagination
        page={1}
        pageSize={10}
        total={35}
        onPageChange={noop}
        onPageSizeChange={noop}
      />,
    );

    expect(screen.getByLabelText("Rows per page")).toBeInTheDocument();
  });

  it("offers a page-size control in cursor mode, which a keyset list still gets to choose", () => {
    render(
      <TablePagination
        mode="cursor"
        rowCount={20}
        hasMore
        hasPrevious
        onNext={noop}
        onPrevious={noop}
        pageSize={20}
        onPageSizeChange={noop}
      />,
    );

    expect(screen.getByLabelText("Rows per page")).toBeInTheDocument();
  });

  it("shows the size currently in force, because jsdom cannot open the Radix listbox to assert the choice itself", () => {
    render(
      <TablePagination
        page={1}
        pageSize={50}
        total={350}
        onPageChange={noop}
        onPageSizeChange={noop}
      />,
    );

    expect(screen.getByLabelText("Rows per page")).toHaveTextContent("50");
  });

  it("renders first/last jumps in offset mode when the caller asks, which DataTable's footer does", () => {
    render(
      <TablePagination
        page={2}
        pageSize={10}
        total={350}
        onPageChange={noop}
        showEdgeJumps
      />,
    );

    expect(screen.getByLabelText("First page")).toBeInTheDocument();
    expect(screen.getByLabelText("Last page")).toBeInTheDocument();
  });

  it("jumps to the true last page, not to one past it", async () => {
    const onPageChange = jest.fn();
    render(
      <TablePagination
        page={1}
        pageSize={10}
        total={35}
        onPageChange={onPageChange}
        showEdgeJumps
      />,
    );

    await userEvent.click(screen.getByLabelText("Last page"));

    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it("disables both edge jumps when there is a single page", () => {
    render(
      <TablePagination
        page={1}
        pageSize={10}
        total={4}
        onPageChange={noop}
        showEdgeJumps
      />,
    );

    expect(screen.getByLabelText("First page")).toBeDisabled();
    expect(screen.getByLabelText("Last page")).toBeDisabled();
  });

  it("shows the position in the walk when the caller tracks one, without offering it as a control", () => {
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

    expect(screen.getByLabelText("Current page 3")).toHaveTextContent(/^3$/);
    expect(screen.queryByLabelText("Page 3")).not.toBeInTheDocument();
  });

  it("keeps the current offset page in the numbered window when detailed page numbers are requested", () => {
    render(
      <TablePagination page={5} pageSize={10} total={100} onPageChange={noop} showPageNumbers />,
    );

    expect(screen.getByLabelText("Page 5")).toHaveAttribute("aria-current", "page");
    expect(screen.getByLabelText("Page 4")).toBeInTheDocument();
    expect(screen.getByLabelText("Page 6")).toBeInTheDocument();
  });

  it("uses the compact previous, current, and next controls by default in offset mode", () => {
    render(
      <TablePagination page={2} pageSize={10} total={35} onPageChange={noop} />,
    );

    expect(screen.getByLabelText("Previous page")).toBeInTheDocument();
    expect(screen.getByLabelText("Current page 2")).toHaveTextContent(/^2$/);
    expect(screen.getByLabelText("Next page")).toBeInTheDocument();
    expect(screen.queryByLabelText("Page 1")).not.toBeInTheDocument();
    expect(screen.queryByText(/of \d+ pages/)).not.toBeInTheDocument();
  });

  it("renders nothing for an empty first page, because a footer over no rows reports nothing", () => {
    const { container } = render(
      <TablePagination
        mode="cursor"
        rowCount={0}
        hasMore={false}
        hasPrevious={false}
        onNext={noop}
        onPrevious={noop}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("still renders an empty page reached by Next, which owes the reader a way back", () => {
    render(
      <TablePagination
        mode="cursor"
        rowCount={0}
        hasMore={false}
        hasPrevious
        onNext={noop}
        onPrevious={noop}
      />,
    );

    expect(screen.getByLabelText("Previous page")).toBeEnabled();
  });

  it("renders nothing in offset mode over an empty result set", () => {
    const { container } = render(
      <TablePagination page={1} pageSize={10} total={0} onPageChange={noop} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
