import { render, screen, within } from "@testing-library/react";
import { ManagedProductOverviewFlow } from "./managed-product-overview-flow";
import { OVERVIEW_SUMMARY } from "./managed-product-overview-test-fixtures";

describe("ManagedProductOverviewFlow", () => {
  it("presents the six-stage value stream in order with useful link names", () => {
    render(<ManagedProductOverviewFlow managedProductId={42} summary={OVERVIEW_SUMMARY} />);

    const list = screen.getByRole("list", { name: "Signal to outcome" });
    const links = within(list).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("aria-label"))).toEqual([
      "Feedback: 12. 3 in last 30 days",
      "Themed: 6. 50% of feedback",
      "Opportunities: 2. 0 accepted",
      "On roadmap: 19. 2 in Now",
      "Shipped: 4. Roadmap items completed",
      "Measured: 1. 1 met · 0 missed",
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/build/managed-products/42/feedback",
      "/build/managed-products/42/feedback",
      "/build/managed-products/42/insights",
      "/build/managed-products/42/roadmap",
      "/build/managed-products/42/roadmap",
      "/build/managed-products/42/insights",
    ]);
  });

  it("uses a compact responsive grid and disables decorative motion for reduced-motion users", () => {
    const { container } = render(
      <ManagedProductOverviewFlow managedProductId={42} summary={OVERVIEW_SUMMARY} />,
    );

    const list = screen.getByRole("list", { name: "Signal to outcome" });
    expect(list).toHaveClass("grid-cols-1", "min-[420px]:grid-cols-2", "sm:grid-cols-3", "lg:grid-cols-6");
    const firstLink = within(list).getAllByRole("link")[0];
    expect(firstLink).toHaveClass("motion-reduce:transform-none", "motion-reduce:transition-none");
    expect(container.querySelectorAll("svg")).toHaveLength(11);
  });

  it("gives every stage a distinct token-based color treatment", () => {
    render(<ManagedProductOverviewFlow managedProductId={42} summary={OVERVIEW_SUMMARY} />);

    const links = within(screen.getByRole("list", { name: "Signal to outcome" })).getAllByRole("link");
    expect(links[0]).toHaveClass("bg-status-info-surface/45");
    expect(links[1]).toHaveClass("bg-muted/45");
    expect(links[2]).toHaveClass("bg-status-warning-surface/45");
    expect(links[3]).toHaveClass("bg-primary/5");
    expect(links[4]).toHaveClass("bg-status-success-surface/45");
    expect(links[5]).toHaveClass("bg-secondary/70");
  });
});
