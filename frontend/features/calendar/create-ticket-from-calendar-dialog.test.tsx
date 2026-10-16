import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateTicketFromCalendarDialog } from "./create-ticket-from-calendar-dialog";

const mockIsMobile = jest.fn(() => false);
const mockCreateTicket = jest.fn().mockResolvedValue({ id: 12, projectId: 3 });
const mockInvalidate = jest.fn().mockResolvedValue(undefined);

jest.mock("@/hooks/common/use-mobile", () => ({ useIsMobile: () => mockIsMobile() }));
jest.mock("@/hooks/api/build", () => ({
  useProjects: () => ({ data: { data: [{ id: 3, key: "SOS", name: "Streamline" }] }, isLoading: false }),
  useCreateTicket: () => ({ isPending: false, mutateAsync: mockCreateTicket }),
}));
jest.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: mockInvalidate }) }));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));

afterEach(() => {
  mockIsMobile.mockReturnValue(false);
  mockCreateTicket.mockClear();
  mockInvalidate.mockClear();
});

const defaultSlot = { start: new Date("2026-10-22T09:00:00.000Z"), end: new Date("2026-10-22T10:00:00.000Z") };

it("keeps project, title, and due date submission in a desktop dialog", async () => {
  const onClose = jest.fn();
  const user = userEvent.setup();
  render(<CreateTicketFromCalendarDialog open onClose={onClose} defaultSlot={defaultSlot} />);

  expect(screen.getByRole("dialog", { name: "Add ticket due date" })).toHaveAttribute("data-slot", "dialog-content");
  const projectSelect = screen.getAllByRole("combobox")[0];
  if (!projectSelect) throw new Error("Project selector is missing");
  projectSelect.focus();
  await user.keyboard("{Enter}{ArrowDown}{Enter}");
  await user.type(screen.getByPlaceholderText("Ticket title"), "Follow up");
  await user.click(screen.getByRole("button", { name: "Create ticket" }));

  await waitFor(() => expect(mockCreateTicket).toHaveBeenCalledWith(expect.objectContaining({ projectId: 3, title: "Follow up", dueDate: "2026-10-22" })));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
});

it("opens from the bottom on mobile and preserves Cancel", async () => {
  mockIsMobile.mockReturnValue(true);
  const onClose = jest.fn();
  render(<CreateTicketFromCalendarDialog open onClose={onClose} defaultSlot={defaultSlot} />);

  expect(screen.getByRole("dialog", { name: "Add ticket due date" })).toHaveClass("data-[state=open]:slide-in-from-bottom");
  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(onClose).toHaveBeenCalledTimes(1);
});
