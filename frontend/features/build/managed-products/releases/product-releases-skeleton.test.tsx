import { render, screen } from "@testing-library/react";
import { ProductReleasesSkeleton } from "./product-releases-skeleton";

describe("ProductReleasesSkeleton", () => {
  it("mirrors the full-height release columns and compact row actions", () => {
    const { container } = render(<ProductReleasesSkeleton />);
    expect(screen.getByTestId("product-releases-skeleton")).toHaveClass("min-h-0", "flex-1");
    expect(container.querySelectorAll('[data-slot="release-action-skeleton"]')).toHaveLength(4);
    expect(container.querySelector('[data-slot="release-action-skeleton"]')).toHaveClass("size-8");
  });

  it("uses distinct bordered nested cards for shipped release placeholders", () => {
    const { container } = render(<ProductReleasesSkeleton />);
    const cards = container.querySelectorAll('[data-slot="shipped-release-card-skeleton"]');
    expect(cards).toHaveLength(5);
    expect(cards[0]).toHaveClass("border", "bg-muted/20", "dark:border-background");
  });
});
