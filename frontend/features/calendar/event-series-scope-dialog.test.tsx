import { fireEvent, render, screen } from "@testing-library/react";
import { EventSeriesScopeDialog } from "./event-series-scope-dialog";

const mockIsMobile = jest.fn(() => false);

jest.mock("@/hooks/common/use-mobile", () => ({ useIsMobile: () => mockIsMobile() }));

afterEach(() => {
  mockIsMobile.mockReturnValue(false);
});

it("opens a desktop dialog and submits the selected occurrence scope", () => {
  const onConfirm = jest.fn();
  render(<EventSeriesScopeDialog open onOpenChange={jest.fn()} onConfirm={onConfirm} isPending={false} />);

  expect(screen.getByRole("dialog", { name: "Edit recurring event" })).toHaveAttribute("data-slot", "dialog-content");
  fireEvent.click(screen.getByRole("radio", { name: "This occurrence only" }));
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(onConfirm).toHaveBeenCalledWith("occurrence");
});

it("opens the same scope choice in a bottom sheet on mobile", () => {
  mockIsMobile.mockReturnValue(true);
  render(<EventSeriesScopeDialog open onOpenChange={jest.fn()} onConfirm={jest.fn()} isPending={false} />);

  const sheet = screen.getByRole("dialog", { name: "Edit recurring event" });
  expect(sheet).toHaveAttribute("data-slot", "sheet-content");
  expect(screen.getByRole("radio", { name: "All occurrences" })).toBeChecked();
});
