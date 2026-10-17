import { render, screen } from "@testing-library/react";
import { CalendarWorkflowRuleDialog } from "./calendar-workflow-rule-dialog";

const mockIsMobile = jest.fn(() => false);

jest.mock("@/hooks/common/use-mobile", () => ({ useIsMobile: () => mockIsMobile() }));
jest.mock("@/hooks/api/calendar-workflows", () => ({
  useCreateCalendarWorkflowRule: () => ({ isPending: false, mutateAsync: jest.fn() }),
}));

afterEach(() => {
  mockIsMobile.mockReturnValue(false);
});

it("keeps the multi-section workflow form and action in a scrollable desktop sheet", () => {
  render(<CalendarWorkflowRuleDialog open onOpenChange={jest.fn()} />);

  const sheet = screen.getByRole("dialog", { name: "Create workflow rule" });
  expect(sheet).toHaveAttribute("data-slot", "sheet-content");
  expect(sheet).toHaveClass("data-[state=open]:slide-in-from-right");
  expect(screen.getByRole("textbox", { name: "Name" })).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Message" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Create rule" })).toBeInTheDocument();
});

it("opens the same workflow form from the bottom on mobile", () => {
  mockIsMobile.mockReturnValue(true);
  render(<CalendarWorkflowRuleDialog open onOpenChange={jest.fn()} />);

  expect(screen.getByRole("dialog", { name: "Create workflow rule" })).toHaveClass("data-[state=open]:slide-in-from-bottom");
});
