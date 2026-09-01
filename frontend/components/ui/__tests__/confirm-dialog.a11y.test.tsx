import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { expectNoAxeViolations } from "@/test-utils/axe";

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type,
    variant,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      type={type ?? "button"}
      data-variant={variant}
      {...rest}
    >
      {children}
    </button>
  ),
  buttonVariants: ({ variant }: { variant?: string } = {}) =>
    `btn${variant ? ` btn-${variant}` : ""}`,
}));

jest.mock("@/components/ui/alert-dialog", () => {
  const TITLE_ID = "mock-alertdialog-title";
  const DialogCtx = React.createContext<{ onOpenChange?: (open: boolean) => void } | null>(null);

  const AlertDialogInner = ({ children, open }: React.PropsWithChildren<{ open?: boolean }>) =>
    open !== undefined
      ? open
        ? <div role="alertdialog" aria-modal="true" aria-labelledby={TITLE_ID}>{children}</div>
        : null
      : <div>{children}</div>;

  const AlertDialog = ({ children, open, onOpenChange }: React.PropsWithChildren<{ open?: boolean; onOpenChange?: (open: boolean) => void }>) => (
    <DialogCtx.Provider value={{ onOpenChange }}>
      <AlertDialogInner open={open}>{children}</AlertDialogInner>
    </DialogCtx.Provider>
  );
  const AlertDialogTrigger = ({ children }: React.PropsWithChildren<{ asChild?: boolean }>) => <>{children}</>;
  const AlertDialogContent = ({ children }: React.PropsWithChildren) => <div>{children}</div>;
  const AlertDialogHeader = ({ children }: React.PropsWithChildren) => <div>{children}</div>;
  const AlertDialogTitle = ({ children }: React.PropsWithChildren) => <h2 id={TITLE_ID}>{children}</h2>;
  const AlertDialogDescription = ({ children, className }: React.PropsWithChildren<{ className?: string }>) => <p className={className}>{children}</p>;
  const AlertDialogFooter = ({ children }: React.PropsWithChildren) => <div>{children}</div>;
  const AlertDialogCancel = ({
    children,
    disabled,
  }: React.PropsWithChildren<{ disabled?: boolean }>) => {
    const ctx = React.useContext(DialogCtx);
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => ctx?.onOpenChange?.(false)}
        data-variant="outline"
      >
        {children}
      </button>
    );
  };
  const AlertDialogAction = ({
    children,
    disabled,
    onClick,
    variant,
    "aria-busy": ariaBusy,
  }: React.PropsWithChildren<{ disabled?: boolean; onClick?: () => void; variant?: string; "aria-busy"?: boolean }>) => (
    <button type="button" disabled={disabled} onClick={onClick} data-variant={variant} aria-busy={ariaBusy}>{children}</button>
  );
  return { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction };
});

function openDialog(
  props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {},
) {
  const onConfirm = jest.fn();
  const onOpenChange = jest.fn();
  render(
    <ConfirmDialog
      title="Delete record"
      description="This action cannot be undone."
      open={true}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      {...props}
    />,
  );
  return { onConfirm, onOpenChange };
}

describe("ConfirmDialog — axe pass", () => {
  it("has no axe violations when open (non-destructive)", async () => {
    const { baseElement } = render(
      <ConfirmDialog
        title="Confirm action"
        description="Are you sure?"
        open={true}
        onOpenChange={jest.fn()}
        onConfirm={jest.fn()}
      />,
    );
    await expectNoAxeViolations(baseElement);
  });

  it("has no axe violations when destructive", async () => {
    const { baseElement } = render(
      <ConfirmDialog
        title="Delete employee"
        description="This will permanently remove the record."
        open={true}
        onOpenChange={jest.fn()}
        onConfirm={jest.fn()}
        destructive
      />,
    );
    await expectNoAxeViolations(baseElement);
  });
});

describe("ConfirmDialog — semantic structure", () => {
  it("renders an alertdialog role so screen readers announce it immediately", () => {
    openDialog();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("renders the title as accessible heading inside the dialog", () => {
    openDialog({ title: "Delete record" });
    expect(
      screen.getByRole("heading", { name: "Delete record" }),
    ).toBeInTheDocument();
  });

  it("renders the description for context", () => {
    openDialog({ description: "This cannot be undone." });
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
  });
});

describe("ConfirmDialog — keyboard usability", () => {
  it("confirms when the confirm button is activated", () => {
    const { onConfirm } = openDialog({ confirmLabel: "Delete" });
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onOpenChange(false) when Cancel is clicked", () => {
    const { onOpenChange } = openDialog({ cancelLabel: "Cancel" });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("disables the confirm button while isPending is true", () => {
    openDialog({ isPending: true, confirmLabel: "Deleting…" });
    const btn = screen.getByRole("button", { name: /Deleting/i });
    expect(btn).toBeDisabled();
  });

  it("hides the confirm button entirely when hideConfirm is true", () => {
    openDialog({ hideConfirm: true, confirmLabel: "Confirm" });
    expect(
      screen.queryByRole("button", { name: "Confirm" }),
    ).not.toBeInTheDocument();
  });
});

describe("ConfirmDialog — destructive confirm must use the destructive variant", () => {
  it("marks the confirm action with the destructive variant when destructive=true", () => {
    openDialog({ destructive: true, confirmLabel: "Delete" });
    const confirmBtn = screen.getByRole("button", { name: "Delete" });
    expect(confirmBtn).toBeInTheDocument();
    expect(confirmBtn.getAttribute("data-variant")).toBe("destructive");
  });

  it("does NOT mark the confirm with destructive variant when destructive=false", () => {
    openDialog({ destructive: false, confirmLabel: "Save" });
    const confirmBtn = screen.getByRole("button", { name: "Save" });
    expect(confirmBtn.getAttribute("data-variant")).not.toBe("destructive");
  });
});

describe("ConfirmDialog — BITE PROOF (remove destructive label → test goes red)", () => {
  it("would fail if the confirm button had no accessible name", () => {
    openDialog({ confirmLabel: "Delete" });
    expect(
      screen.getByRole("button", { name: "Delete" }),
    ).toBeInTheDocument();
  });
});
