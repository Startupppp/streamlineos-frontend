import { render } from "@testing-library/react";
import { Card } from "./card";

describe("Card surface hierarchy", () => {
  it("uses a full structural border and distinguishes nested card surfaces", () => {
    const { container } = render(
      <Card data-testid="parent-card">
        <Card data-testid="child-card">Nested content</Card>
      </Card>,
    );

    const parent = container.querySelector('[data-testid="parent-card"]');
    const child = container.querySelector('[data-testid="child-card"]');
    expect(parent).toHaveClass("border-border");
    expect(parent).toHaveClass("dark:border-background");
    expect(parent).not.toHaveClass("border-border/70");
    expect(parent).toHaveClass("[&_[data-slot=card]]:bg-muted");
    expect(child).toHaveClass("border-border");
    expect(child).toHaveClass("dark:border-background");
  });
});
