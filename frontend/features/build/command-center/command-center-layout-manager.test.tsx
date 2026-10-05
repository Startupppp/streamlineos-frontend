import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { CommandCenterLayoutPanel, LayoutResetButton } from "./command-center-layout-manager";

jest.mock("lucide-react", () => ({
  ChevronUp: () => <svg data-testid="chevron-up" />,
  ChevronDown: () => <svg data-testid="chevron-down" />,
  X: () => <svg data-testid="x-icon" />,
  RotateCcw: () => <svg data-testid="rotate-icon" />,
}));

describe("CommandCenterLayoutPanel", () => {
  function renderPanel(overrides: Partial<{
    index: number;
    total: number;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onRemove: () => void;
  }> = {}) {
    const onMoveUp = overrides.onMoveUp ?? jest.fn();
    const onMoveDown = overrides.onMoveDown ?? jest.fn();
    const onRemove = overrides.onRemove ?? jest.fn();
    render(
      <CommandCenterLayoutPanel
        widgetType="my-issues"
        index={overrides.index ?? 1}
        total={overrides.total ?? 3}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onRemove={onRemove}
      >
        <div data-testid="panel-content">My Issues Panel</div>
      </CommandCenterLayoutPanel>,
    );
    return { onMoveUp, onMoveDown, onRemove };
  }

  it("renders children inside the layout panel wrapper", () => {
    renderPanel();
    expect(screen.getByTestId("panel-content")).toBeInTheDocument();
  });

  it("renders the widget with the correct data-widget-type attribute for identification", () => {
    renderPanel();
    expect(document.querySelector("[data-widget-type='my-issues']")).toBeInTheDocument();
  });

  it("calls onMoveUp when the Move up button is clicked", () => {
    const { onMoveUp } = renderPanel({ index: 1 });
    fireEvent.click(screen.getByRole("button", { name: /move my-issues widget up/i }));
    expect(onMoveUp).toHaveBeenCalledTimes(1);
  });

  it("calls onMoveDown when the Move down button is clicked", () => {
    const { onMoveDown } = renderPanel({ index: 1 });
    fireEvent.click(screen.getByRole("button", { name: /move my-issues widget down/i }));
    expect(onMoveDown).toHaveBeenCalledTimes(1);
  });

  it("calls onRemove when the Remove button is clicked", () => {
    const { onRemove } = renderPanel({ index: 1 });
    fireEvent.click(screen.getByRole("button", { name: /remove my-issues widget/i }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("disables the Move up button when the panel is at index 0 so keyboard navigation cannot go above the top", () => {
    renderPanel({ index: 0 });
    expect(screen.getByRole("button", { name: /move my-issues widget up/i })).toBeDisabled();
  });

  it("enables the Move up button when the panel is not at index 0 — paired with the disabled test above", () => {
    renderPanel({ index: 1 });
    expect(screen.getByRole("button", { name: /move my-issues widget up/i })).not.toBeDisabled();
  });

  it("disables the Move down button when the panel is the last item so keyboard navigation cannot go below the bottom", () => {
    renderPanel({ index: 2, total: 3 });
    expect(screen.getByRole("button", { name: /move my-issues widget down/i })).toBeDisabled();
  });

  it("enables the Move down button when the panel is not the last item — paired with the disabled test above", () => {
    renderPanel({ index: 1, total: 3 });
    expect(screen.getByRole("button", { name: /move my-issues widget down/i })).not.toBeDisabled();
  });
});

describe("LayoutResetButton", () => {
  it("calls onReset when the reset layout button is clicked", () => {
    const onReset = jest.fn();
    render(<LayoutResetButton onReset={onReset} />);
    fireEvent.click(screen.getByRole("button", { name: /reset dashboard layout/i }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
