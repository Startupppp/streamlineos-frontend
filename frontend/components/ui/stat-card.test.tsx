import { render } from "@testing-library/react";
import { StatCard, StatCardGrid } from "./stat-card";

describe("StatCardGrid", () => {
  it("keeps cards in a single equal-width row from child count", () => {
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
      "overflow-x-auto",
      "scrollbar-hide",
      "touch-pan-x",
      "md:snap-none",
      "[&>*]:min-w-0",
      "[&>*]:h-full",
    );
    expect(grid).not.toHaveClass("md:overflow-x-visible");
    expect(grid).toHaveStyle({
      gridTemplateColumns: "repeat(2, minmax(10rem, 1fr))",
    });
    expect(grid).not.toHaveClass("grid-cols-1");
    expect(grid).not.toHaveClass("sm:grid-cols-2");
  });

  it("sizes denser strips from child count, not responsive breakpoints", () => {
    const { container } = render(
      <StatCardGrid cols={6}>
        <StatCard label="First" value={1} />
        <StatCard label="Second" value={2} />
        <StatCard label="Third" value={3} />
        <StatCard label="Fourth" value={4} />
        <StatCard label="Fifth" value={5} />
        <StatCard label="Sixth" value={6} />
      </StatCardGrid>,
    );

    const grid = container.firstElementChild;
    expect(grid).toHaveStyle({
      gridTemplateColumns: "repeat(6, minmax(10rem, 1fr))",
    });
    expect(grid).not.toHaveClass("grid-cols-1");
    expect(grid).not.toHaveClass("sm:grid-cols-2");
    expect(grid).not.toHaveClass("md:grid-cols-3");
    expect(grid).not.toHaveClass("xl:grid-cols-6");
  });

  it("keeps a three-card strip as one non-wrapping row under flex shells", () => {
    const { container } = render(
      <StatCardGrid cols={3}>
        <StatCard label="First" value={1} />
        <StatCard label="Second" value={2} />
        <StatCard label="Third" value={3} />
      </StatCardGrid>,
    );

    const grid = container.firstElementChild;
    expect(grid).toHaveClass("shrink-0", "overflow-x-auto", "md:snap-none");
    expect(grid).toHaveStyle({
      gridTemplateColumns: "repeat(3, minmax(10rem, 1fr))",
    });
    expect(grid).not.toHaveClass("grid-cols-1");
    expect(grid).not.toHaveClass("sm:grid-cols-2");
    expect(grid).not.toHaveClass("xl:grid-cols-3");
  });
});
