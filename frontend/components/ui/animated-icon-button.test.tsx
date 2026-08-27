import * as React from "react";
import { render, screen } from "@testing-library/react";
import { AnimatedIconButton } from "./animated-icon-button";

const MockIcon = React.forwardRef<Record<string, unknown>, Record<string, unknown>>(
  function MockIcon(_props, _ref) {
    return <svg aria-hidden="true" data-testid="mock-icon" />;
  },
);

describe("AnimatedIconButton — accessible name", () => {
  it("exposes the label to screen readers when aria-label is the accessible name", () => {
    render(<AnimatedIconButton icon={MockIcon} aria-label="Close panel" />);
    expect(screen.getByRole("button", { name: "Close panel" })).toBeInTheDocument();
  });

  it("exposes the text when children are the accessible name", () => {
    render(<AnimatedIconButton icon={MockIcon}>New sprint</AnimatedIconButton>);
    expect(screen.getByRole("button", { name: "New sprint" })).toBeInTheDocument();
  });

  it("exposes both icon and label text when both are present", () => {
    render(
      <AnimatedIconButton icon={MockIcon} aria-label="Add item">
        Add item
      </AnimatedIconButton>,
    );
    expect(screen.getByRole("button", { name: "Add item" })).toBeInTheDocument();
  });

  it("is a button element so keyboard users can activate it", () => {
    render(<AnimatedIconButton icon={MockIcon} aria-label="Delete" />);
    const btn = screen.getByRole("button", { name: "Delete" });
    expect(btn.tagName).toBe("BUTTON");
  });

  it("passes through disabled state so AT can announce the control is unavailable", () => {
    render(<AnimatedIconButton icon={MockIcon} aria-label="Submit" disabled />);
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
  });
});
