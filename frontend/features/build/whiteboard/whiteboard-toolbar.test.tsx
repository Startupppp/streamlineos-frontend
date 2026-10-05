import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { WhiteboardToolbar } from "./whiteboard-toolbar";

jest.mock("@/components/ui/animated-icon-button", () => ({
  AnimatedIconButton: ({ onClick, "aria-label": ariaLabel }: { onClick?: () => void; "aria-label"?: string }) => (
    <button onClick={onClick} aria-label={ariaLabel} />
  ),
}));

jest.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => asChild ? <>{children}</> : <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    "aria-label": ariaLabel,
    disabled,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    "aria-label"?: string;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} aria-label={ariaLabel} disabled={disabled}>
      {children}
    </button>
  ),
}));

function baseProps(overrides: Partial<Parameters<typeof WhiteboardToolbar>[0]> = {}) {
  return {
    saveStatus: "clean" as const,
    isViewMode: false,
    canManage: true,
    isFullscreen: false,
    shareToken: null,
    onManualSave: jest.fn(),
    onToggleFullscreen: jest.fn(),
    onOpenShare: jest.fn(),
    ...overrides,
  };
}

describe("WhiteboardToolbar — export button", () => {
  it("renders the Export PNG button when onExport is provided", () => {
    render(<WhiteboardToolbar {...baseProps({ onExport: jest.fn() })} />);
    expect(screen.getByRole("button", { name: "Export board as PNG" })).toBeInTheDocument();
  });

  it("does not render the Export PNG button when onExport is not provided", () => {
    render(<WhiteboardToolbar {...baseProps()} />);
    expect(screen.queryByRole("button", { name: "Export board as PNG" })).not.toBeInTheDocument();
  });

  it("calls onExport when the export button is clicked", () => {
    const handleExport = jest.fn();
    render(<WhiteboardToolbar {...baseProps({ onExport: handleExport })} />);
    fireEvent.click(screen.getByRole("button", { name: "Export board as PNG" }));
    expect(handleExport).toHaveBeenCalledTimes(1);
  });
});

describe("WhiteboardToolbar — save button", () => {
  it("renders the Save board button when not in view mode", () => {
    render(<WhiteboardToolbar {...baseProps({ saveStatus: "dirty" })} />);
    expect(screen.getByRole("button", { name: "Save board" })).toBeInTheDocument();
  });

  it("does not render the Save board button in view mode", () => {
    render(<WhiteboardToolbar {...baseProps({ isViewMode: true })} />);
    expect(screen.queryByRole("button", { name: "Save board" })).not.toBeInTheDocument();
  });
});
