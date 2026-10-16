import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { TicketDetailToolbar } from "./ticket-detail-toolbar";

let mockCanDelete = false;
jest.mock("@/hooks/api/access", () => ({ useCan: () => mockCanDelete }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

beforeEach(() => {
  jest.clearAllMocks();
  mockCanDelete = false;
});

it("expands the collapsed panel without offering an unauthorized delete", () => {
  const onExpandRightPanel = jest.fn();
  render(<TicketDetailToolbar isMobile={false} rightPanelCollapsed onExpandRightPanel={onExpandRightPanel} onDelete={jest.fn()} isDeleting={false} />);
  fireEvent.click(screen.getByRole("button", { name: "Expand details panel" }));
  expect(onExpandRightPanel).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("button", { name: "Delete ticket" })).not.toBeInTheDocument();
});

it("copies the current URL through the desktop share action", async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  render(<TicketDetailToolbar isMobile={false} rightPanelCollapsed={false} onExpandRightPanel={jest.fn()} onDelete={jest.fn()} isDeleting={false} />);
  fireEvent.click(screen.getByRole("button", { name: "Copy share link" }));
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Link copied to clipboard"));
  expect(writeText).toHaveBeenCalledWith(window.location.href);
});

it("reports a clipboard error without claiming the link was copied", async () => {
  const writeText = jest.fn().mockRejectedValue(new Error("Clipboard unavailable"));
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  render(<TicketDetailToolbar isMobile={false} rightPanelCollapsed={false} onExpandRightPanel={jest.fn()} onDelete={jest.fn()} isDeleting={false} />);
  fireEvent.click(screen.getByRole("button", { name: "Copy share link" }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Clipboard unavailable"));
  expect(toast.success).not.toHaveBeenCalled();
});

it("requires confirmation before the desktop delete callback", async () => {
  mockCanDelete = true;
  const user = userEvent.setup();
  const onDelete = jest.fn();
  render(<TicketDetailToolbar isMobile={false} rightPanelCollapsed={false} onExpandRightPanel={jest.fn()} onDelete={onDelete} isDeleting={false} />);
  await user.click(screen.getByRole("button", { name: "Delete ticket" }));
  expect(onDelete).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Delete" }));
  expect(onDelete).toHaveBeenCalledTimes(1);
});

it("opens the mobile overflow confirmation before deleting", async () => {
  mockCanDelete = true;
  const user = userEvent.setup();
  const onDelete = jest.fn();
  render(<TicketDetailToolbar isMobile rightPanelCollapsed={false} onExpandRightPanel={jest.fn()} onDelete={onDelete} isDeleting={false} />);
  await user.click(screen.getByRole("button", { name: "More actions" }));
  await user.click(screen.getByRole("menuitem", { name: "Delete" }));
  expect(screen.getByRole("alertdialog")).toHaveTextContent("Delete Ticket");
  expect(onDelete).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Delete" }));
  expect(onDelete).toHaveBeenCalledTimes(1);
});

it("names the child count and their fate in the desktop delete confirmation", async () => {
  mockCanDelete = true;
  const user = userEvent.setup();
  render(<TicketDetailToolbar isMobile={false} rightPanelCollapsed={false} onExpandRightPanel={jest.fn()} onDelete={jest.fn()} isDeleting={false} subtaskCount={1} />);
  await user.click(screen.getByRole("button", { name: "Delete ticket" }));
  expect(screen.getByText("This ticket has 1 subtask. They will be kept without a parent. This cannot be undone.")).toBeInTheDocument();
});

it("pluralizes the child count in the mobile delete confirmation", async () => {
  mockCanDelete = true;
  const user = userEvent.setup();
  render(<TicketDetailToolbar isMobile rightPanelCollapsed={false} onExpandRightPanel={jest.fn()} onDelete={jest.fn()} isDeleting={false} subtaskCount={3} />);
  await user.click(screen.getByRole("button", { name: "More actions" }));
  await user.click(screen.getByRole("menuitem", { name: "Delete" }));
  expect(screen.getByRole("alertdialog")).toHaveTextContent("This ticket has 3 subtasks. They will be kept without a parent.");
});

it("warns only that the delete is permanent when the ticket has no children", async () => {
  mockCanDelete = true;
  const user = userEvent.setup();
  render(<TicketDetailToolbar isMobile={false} rightPanelCollapsed={false} onExpandRightPanel={jest.fn()} onDelete={jest.fn()} isDeleting={false} subtaskCount={0} />);
  await user.click(screen.getByRole("button", { name: "Delete ticket" }));
  expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
  expect(screen.queryByText(/subtask/i)).not.toBeInTheDocument();
});

it("shows share as a button on mobile when delete is unavailable", () => {
  render(
    <TicketDetailToolbar
      isMobile
      rightPanelCollapsed={false}
      onExpandRightPanel={jest.fn()}
      onDelete={jest.fn()}
      isDeleting={false}
    />,
  );
  expect(screen.queryByRole("button", { name: "More actions" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Copy share link" })).toBeInTheDocument();
});
