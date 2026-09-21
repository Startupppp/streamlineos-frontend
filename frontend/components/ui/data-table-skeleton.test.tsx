import { render, screen } from "@testing-library/react";
import { DataTableSkeleton } from "./data-table-skeleton";

jest.mock("@/hooks/common/use-online-status", () => ({ useOnlineStatus: () => true }));

describe("a table skeleton shows the real column headers before the rows arrive", () => {
  it("renders the named headers and no numbered placeholders", () => {
    render(<DataTableSkeleton rows={3} headers={["Employee", "Status", "Opened"]} />);
    for (const name of ["Employee", "Status", "Opened"])
      expect(screen.getByRole("columnheader", { name })).toBeInTheDocument();
    expect(screen.queryByText(/Column \d/)).not.toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(4);
  });

  it("falls back to numbered screen-reader labels when only a count is known", () => {
    render(<DataTableSkeleton rows={2} columns={2} />);
    expect(screen.getByRole("columnheader", { name: "Column 1" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Column 2" })).toBeInTheDocument();
  });
});
