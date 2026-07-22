import { render } from "@testing-library/react";
import { StatCard, StatCardGrid } from "./stat-card";

describe("StatCardGrid", () => {
  it("reflows with responsive columns and does not force a fixed track count", () => {
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
      "shrink-0",
      "grid-cols-1",
      "sm:grid-cols-2",
      "lg:grid-cols-3",
      "xl:grid-cols-4",
      "[&>*]:min-w-0",
    );
    expect(grid).not.toHaveClass("overflow-x-auto");
    expect(grid).not.toHaveClass(
      "grid-cols-[repeat(4,minmax(176px,1fr))]",
    );
  });

  it("honors the cols prop for denser strips", () => {
    const { container } = render(
      <StatCardGrid cols={6}>
        <StatCard label="First" value={1} />
      </StatCardGrid>,
    );

    expect(container.firstElementChild).toHaveClass(
      "grid-cols-1",
      "sm:grid-cols-2",
      "md:grid-cols-3",
      "xl:grid-cols-6",
    );
  });

  it("keeps a three-column strip from collapsing under flex shells", () => {
    const { container } = render(
      <StatCardGrid cols={3}>
        <StatCard label="First" value={1} />
        <StatCard label="Second" value={2} />
        <StatCard label="Third" value={3} />
      </StatCardGrid>,
    );

    expect(container.firstElementChild).toHaveClass(
      "shrink-0",
      "grid-cols-1",
      "sm:grid-cols-2",
      "xl:grid-cols-3",
    );
  });
});
