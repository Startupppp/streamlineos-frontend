import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmSheet } from "./confirm-sheet";

jest.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div role="dialog">{children}</div> : null,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <footer>{children}</footer>,
}));

jest.mock("@/components/ui/loading-button", () => ({
  LoadingButton: ({
    children,
    onClick,
    isPending,
    variant,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    isPending?: boolean;
    variant?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      aria-busy={isPending}
      data-variant={variant}
    >
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

const defaultProps = {
  open: true,
  onOpenChange: jest.fn(),
  title: "Delete ticket",
  description: "This cannot be undone.",
  onConfirm: jest.fn(),
};

describe("ConfirmSheet — render and interaction", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders the title and description when open", () => {
    render(<ConfirmSheet {...defaultProps} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Delete ticket")).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
  });

  it("does not render when open=false", () => {
    render(<ConfirmSheet {...defaultProps} open={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls onConfirm when the confirm button is clicked", () => {
    const onConfirm = jest.fn();
    render(<ConfirmSheet {...defaultProps} onConfirm={onConfirm} confirmLabel="Delete" />);
    fireEvent.click(screen.getByText("Delete"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onOpenChange(false) when the cancel button is clicked", () => {
    const onOpenChange = jest.fn();
    render(<ConfirmSheet {...defaultProps} onOpenChange={onOpenChange} cancelLabel="Never mind" />);
    fireEvent.click(screen.getByText("Never mind"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("disables the cancel button and prevents close while isPending", () => {
    const onOpenChange = jest.fn();
    render(
      <ConfirmSheet {...defaultProps} onOpenChange={onOpenChange} isPending cancelLabel="Cancel" />,
    );
    const cancelBtn = screen.getByText("Cancel");
    expect(cancelBtn).toBeDisabled();
  });

  it("shows the confirm button as busy while isPending", () => {
    render(<ConfirmSheet {...defaultProps} isPending confirmLabel="Saving" />);
    expect(screen.getByText("Saving")).toHaveAttribute("aria-busy", "true");
  });

  it("renders the confirm button as destructive variant when destructive=true", () => {
    render(<ConfirmSheet {...defaultProps} destructive confirmLabel="Delete forever" />);
    expect(screen.getByText("Delete forever")).toHaveAttribute("data-variant", "destructive");
  });

  it("renders the confirm button as default variant when destructive is not set", () => {
    render(<ConfirmSheet {...defaultProps} confirmLabel="Confirm" />);
    expect(screen.getByText("Confirm")).toHaveAttribute("data-variant", "default");
  });
});

describe("ConfirmSheet — default labels", () => {
  it("uses 'Confirm' and 'Cancel' as default button labels", () => {
    render(<ConfirmSheet {...defaultProps} />);
    expect(screen.getByText("Confirm")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });
});
