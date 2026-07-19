import { render } from "@testing-library/react";
import { StatCard, StatCardGrid } from "./stat-card";

describe("StatCardGrid", () => {
  it("uses a touch-scrollable row below the small breakpoint when mobileScroll is enabled", () => {
    const { container } = render(
      <StatCardGrid cols={4} mobileScroll>
        <StatCard label="First" value={1} />
        <StatCard label="Second" value={2} />
      </StatCardGrid>,
    );

    const grid = container.firstElementChild;
    expect(grid).toHaveClass(
      "flex",
      "overflow-x-auto",
      "snap-x",
      "sm:grid",
      "sm:grid-cols-4",
      "[&>*]:min-w-[176px]",
      "sm:[&>*]:min-w-0",
    );
  });

  it("keeps the regular grid for consumers that do not opt in", () => {
    const { container } = render(
      <StatCardGrid cols={4}>
        <StatCard label="First" value={1} />
      </StatCardGrid>,
    );

    expect(container.firstElementChild).toHaveClass("grid", "grid-cols-4");
    expect(container.firstElementChild).not.toHaveClass("overflow-x-auto");
  });
});
