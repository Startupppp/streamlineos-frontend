import { fireEvent, render, screen } from "@testing-library/react";
import { EventSeriesScopeDialog } from "./event-series-scope-dialog";

const mockIsMobile = jest.fn(() => false);

jest.mock("@/hooks/common/use-mobile", () => ({ useIsMobile: () => mockIsMobile() }));

afterEach(() => {
  mockIsMobile.mockReturnValue(false);
});

it("opens the scope choice in a desktop dialog and submits the selected occurrence", () => {
  const onConfirm = jest.fn();
  render(<EventSeriesScopeDialog open onOpenChange={jest.fn()} onConfirm={onConfirm} isPending={false} />);

  const dialog = screen.getByRole("dialog", { name: "Edit recurring event" });
  expect(dialog).toHaveAttribute("data-slot", "dialog-content");
  fireEvent.click(screen.getByRole("radio", { name: "This occurrence only" }));
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(onConfirm).toHaveBeenCalledWith("occurrence");
});

it("opens from the bottom on mobile and keeps dismissal blocked while saving", () => {
  mockIsMobile.mockReturnValue(true);
  const onOpenChange = jest.fn();
  render(<EventSeriesScopeDialog open onOpenChange={onOpenChange} onConfirm={jest.fn()} isPending />);

  const sheet = screen.getByRole("dialog", { name: "Edit recurring event" });
  expect(sheet).toHaveAttribute("data-slot", "sheet-content");
  expect(sheet).toHaveClass("data-[state=open]:slide-in-from-bottom");
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(onOpenChange).not.toHaveBeenCalled();
});
