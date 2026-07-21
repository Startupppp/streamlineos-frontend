import { render } from "@testing-library/react";
import { StatCard, StatCardGrid } from "./stat-card";

describe("StatCardGrid", () => {
  it("keeps a comfortable card min-width and scrolls instead of compressing", () => {
    const { container } = render(
      <StatCardGrid cols={4}>
        <StatCard label="First" value={1} />
        <StatCard label="Second" value={2} />
      </StatCardGrid>,
    );

    const grid = container.firstElementChild;
    expect(grid).toHaveClass(
      "grid",
      "min-w-0",
      "overflow-x-auto",
      "scrollbar-hide",
      "grid-cols-[repeat(4,minmax(176px,1fr))]",
    );
    expect(grid).not.toHaveClass("[&>*]:min-w-0");
  });

  it("honors the cols prop for denser strips", () => {
    const { container } = render(
      <StatCardGrid cols={6}>
        <StatCard label="First" value={1} />
      </StatCardGrid>,
    );

    expect(container.firstElementChild).toHaveClass(
      "grid-cols-[repeat(6,minmax(176px,1fr))]",
    );
  });
});
