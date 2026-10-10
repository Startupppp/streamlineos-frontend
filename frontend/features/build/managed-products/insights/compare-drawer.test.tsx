import { render, screen } from "@testing-library/react";
import { CompareDrawer, COMPARE_MAX } from "./compare-drawer";

const noop = jest.fn();

const MOCK_ITEMS = [
  { id: 1, title: "Automate invoicing" },
  { id: 2, title: "Improve onboarding" },
  { id: 3, title: "Mobile search" },
  { id: 4, title: "Notification center" },
  { id: 5, title: "Dashboard analytics" },
  { id: 6, title: "Export to CSV" },
];

describe("CompareDrawer — max items limit (BSN-COMPARE-LIMIT)", () => {
  it("exports COMPARE_MAX as 5 so the UI never allows more than five items to be compared simultaneously", () => {
    expect(COMPARE_MAX).toBe(5);
  });

  it("renders one row per selected item in the drawer so each opportunity is represented in the comparison view", () => {
    const selected = new Set([1, 2, 3]);
    render(
      <CompareDrawer
        open
        onOpenChange={noop}
        selected={selected}
        onDeselect={noop}
        compareData={undefined}
        isLoading={false}
        allItems={MOCK_ITEMS}
      />,
    );

    expect(screen.getByTestId("compare-row-1")).toBeInTheDocument();
    expect(screen.getByTestId("compare-row-2")).toBeInTheDocument();
    expect(screen.getByTestId("compare-row-3")).toBeInTheDocument();
    expect(screen.queryByTestId("compare-row-4")).not.toBeInTheDocument();
  });

  it("renders five rows when five items are selected without violating the limit so a full compare view is achievable", () => {
    const selected = new Set([1, 2, 3, 4, 5]);
    render(
      <CompareDrawer
        open
        onOpenChange={noop}
        selected={selected}
        onDeselect={noop}
        compareData={undefined}
        isLoading={false}
        allItems={MOCK_ITEMS}
      />,
    );

    for (let id = 1; id <= 5; id++) {
      expect(screen.getByTestId(`compare-row-${id}`)).toBeInTheDocument();
    }
    expect(screen.queryByTestId("compare-row-6")).not.toBeInTheDocument();
  });
});
