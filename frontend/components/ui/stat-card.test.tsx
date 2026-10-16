import { render } from "@testing-library/react";
import { Users } from "lucide-react";
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

  it("counts fragment children so CRM conditional cards stay one row", () => {
    const { container } = render(
      <StatCardGrid cols={4}>
        <StatCard label="Open Roles" value={1} />
        <StatCard label="Conversion Rate" value="10%" />
        <>
          <StatCard label="MRR (Won)" value="₹1K" />
          <StatCard label="Pipeline Value" value="₹2K" />
        </>
      </StatCardGrid>,
    );

    const grid = container.firstElementChild;
    expect(grid).toHaveStyle({
      gridTemplateColumns: "repeat(4, minmax(10rem, 1fr))",
    });
  });
});

describe("StatCard tones", () => {
  // The surface lands on the icon well and the ink on the icon inside it, so
  // the whole subtree is the unit under test.
  function toneClasses(node: HTMLElement): string {
    return node.innerHTML;
  }

  it("paints a status tone from tokens, so the dark pairing cannot be forgotten", () => {
    const { container } = render(<StatCard label="Active" value={7} icon={Users} tone="emerald" />);
    const classes = toneClasses(container);

    expect(classes).toContain("bg-status-success-surface");
    expect(classes).toContain("text-status-success-ink");
  });

  it("maps warning and danger tones onto their own roles", () => {
    const { container: warn } = render(<StatCard label="Due" value={1} icon={Users} tone="amber" />);
    expect(toneClasses(warn)).toContain("bg-status-warning-surface");

    const { container: bad } = render(<StatCard label="Failed" value={2} icon={Users} tone="red" />);
    expect(toneClasses(bad)).toContain("bg-status-danger-surface");
  });

  it("carries no hardcoded palette literal, which would need a hand-written dark twin", () => {
    const { container } = render(<StatCard label="Active" value={7} icon={Users} tone="emerald" />);
    expect(container.innerHTML).not.toMatch(/emerald-\d{2,3}/);
    expect(container.innerHTML).not.toContain("dark:bg-");
  });

  it("keeps neutral tones on the existing surface tokens", () => {
    const { container } = render(<StatCard label="Total" value={9} icon={Users} tone="default" />);
    expect(container.innerHTML).toContain("bg-muted");
  });
});

