import { render, screen } from "@testing-library/react";
import { SourceWhyList } from "./source-why-list";

describe("SourceWhyList", () => {
  it("lists each source with its date or date range", () => {
    render(
      <SourceWhyList
        sources={[
          { table: "leave_requests", id: 7, label: "Unpaid leave · 2d", date: "2026-10-12", endDate: "2026-10-13" },
          { table: "attendance", id: null, label: "Absent · 1 day" },
          { table: "expenses", id: 12, label: "Expense claim #12 · Travel", date: "2026-10-04", endDate: null },
        ]}
      />,
    );

    expect(screen.getByText("Why")).toBeInTheDocument();
    expect(screen.getByText(/Unpaid leave · 2d · 12 Oct 2026 – 13 Oct 2026/)).toBeInTheDocument();
    expect(screen.getByText("Absent · 1 day")).toBeInTheDocument();
    expect(screen.getByText(/Expense claim #12 · Travel · 4 Oct 2026/)).toBeInTheDocument();
  });

  it("renders nothing when a line has no sources", () => {
    const { container } = render(<SourceWhyList sources={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
