import { fireEvent, render, screen } from "@testing-library/react";
import { PageActionPicker } from "./page-action-picker";
import { SCOPE_OPTIONS } from "./page-action-picker-parts";

const CATALOG = [
  {
    name: "hr:employees:view",
    resource: "employees",
    action: "view",
    description: "View employee records",
    scopable: true,
  },
];

describe("SCOPE_OPTIONS — grantable scope choices", () => {
  it("offers no team choice in the scope selector, because the query layer cannot honour a team scope without materialised org-unit membership", () => {
    const offeredScopes = SCOPE_OPTIONS.map((o) => o.value);
    expect(offeredScopes).not.toContain("team");
  });
});

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
