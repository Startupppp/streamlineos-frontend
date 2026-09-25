import { render, screen } from "@testing-library/react";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";

/**
 * PAY-002: on a 390px screen the third card sat off the right edge behind a
 * hidden scrollbar. The stacked row has to put the column count on a class the
 * `sm:` breakpoint can beat, not on an inline style that always wins.
 */
describe("StatCardGrid stackOnMobile", () => {
  it("stacks to one column below sm and restores the template above it", () => {
    render(
      <StatCardGrid cols={3} stackOnMobile>
        <StatCard label="Net Pay Last Month" value="₹1" />
        <StatCard label="YTD Earnings" value="₹2" />
        <StatCard label="Pending Claims" value="3" />
      </StatCardGrid>,
    );

    const grid = document.querySelector("[data-slot=stat-card-grid]");
    expect(grid).not.toBeNull();
    expect(grid).toHaveClass("grid-cols-1");
    expect(grid).toHaveClass(
      "sm:[grid-template-columns:var(--stat-card-grid-template)]",
    );
    expect((grid as HTMLElement).style.gridTemplateColumns).toBe("");
    expect(
      (grid as HTMLElement).style.getPropertyValue("--stat-card-grid-template"),
    ).toBe("repeat(3, minmax(10rem, 1fr))");

    for (const label of ["Net Pay Last Month", "YTD Earnings", "Pending Claims"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("leaves the default row on its inline template", () => {
    render(
      <StatCardGrid cols={3}>
        <StatCard label="A" value="1" />
        <StatCard label="B" value="2" />
        <StatCard label="C" value="3" />
      </StatCardGrid>,
    );

    const grid = document.querySelector("[data-slot=stat-card-grid]") as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe("repeat(3, minmax(10rem, 1fr))");
    expect(grid).not.toHaveClass("grid-cols-1");
  });
});
