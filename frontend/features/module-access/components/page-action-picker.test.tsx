import { fireEvent, render, screen } from "@testing-library/react";
import { PageActionPicker } from "./page-action-picker";

const CATALOG = [
  {
    name: "hr:employees:view",
    resource: "employees",
    action: "view",
    description: "View employee records",
    scopable: true,
  },
];

describe("PageActionPicker read-only state", () => {
  it("replaces mutation widgets with a readable permission summary", () => {
    const onDraftChange = jest.fn();
    render(
      <PageActionPicker
        catalog={CATALOG}
        draft={{ "hr:employees:view": "all" }}
        onDraftChange={onDraftChange}
        readOnly
      />,
    );

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /select all/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Expand Employees" }));

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByText("All")).toBeInTheDocument();
    expect(onDraftChange).not.toHaveBeenCalled();
  });

  it("keeps permission mutation widgets available to managers", () => {
    render(
      <PageActionPicker
        catalog={CATALOG}
        draft={{ "hr:employees:view": "all" }}
        onDraftChange={jest.fn()}
        readOnly={false}
      />,
    );

    expect(screen.getByRole("checkbox", { name: "Employees - full access" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Expand Employees" }));
    expect(screen.getByRole("checkbox", { name: "Grant view" })).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });
});
