import { render, screen, fireEvent } from "@testing-library/react";
import { TicketQuickActions } from "./ticket-quick-actions";

const deleteMutate = jest.fn();
const bulkMutate = jest.fn();
let mockCan: Record<string, boolean> = {};

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => mockCan[key] ?? false,
}));

jest.mock("@/hooks/api/build/ticket-create-rank-mutations", () => ({
  useDeleteTicket: () => ({ mutate: deleteMutate, isPending: false }),
  useBulkUpdateTickets: () => ({ mutate: bulkMutate, isPending: false }),
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@animateicons/react/lucide", () => ({
  EllipsisIcon: () => <svg data-testid="ellipsis" />,
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: ({
    open,
    title,
    confirmLabel,
    onConfirm,
  }: {
    open: boolean;
    title: string;
    confirmLabel: string;
    onConfirm: () => void;
  }) =>
    open ? (
      <div data-testid="confirm">
        <p>{title}</p>
        <button type="button" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    ) : null,
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

import { toast } from "sonner";

const writeText = jest.fn();

beforeEach(() => {
  mockCan = { "build:tickets:update": true, "build:tickets:delete": true };
  deleteMutate.mockReset();
  bulkMutate.mockReset();
  writeText.mockReset();
  (toast.success as jest.Mock).mockClear();
  (toast.error as jest.Mock).mockClear();
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
});

function renderActions(props: Partial<React.ComponentProps<typeof TicketQuickActions>> = {}) {
  return render(
    <TicketQuickActions
      ticketId={7}
      projectId={1}
      projectKey="ENG"
      ticketNumber={12}
      {...props}
    />,
  );
}

function openMenu() {
  const trigger = screen.getByRole("button", { name: "Ticket actions" });
  fireEvent.keyDown(trigger, { key: "Enter" });
}

describe("TicketQuickActions — the row menu mirrors the commands the spec lists", () => {
  it("offers open, copy link, copy key, archive and delete for an authorized viewer", () => {
    renderActions({ onOpen: jest.fn() });
    openMenu();
    expect(screen.getByRole("menuitem", { name: "Open" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Copy link" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Copy key" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Archive" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Delete" })).toBeInTheDocument();
  });

  it("offers archive but not delete to a viewer who may update and not delete", () => {
    mockCan = { "build:tickets:update": true };
    renderActions();
    openMenu();
    expect(screen.getByRole("menuitem", { name: "Archive" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("offers neither archive nor delete to a read-only viewer, who still gets the copy commands", () => {
    mockCan = {};
    renderActions();
    openMenu();
    expect(screen.queryByRole("menuitem", { name: "Archive" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Delete" })).not.toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Copy key" })).toBeInTheDocument();
  });

  it("opens the ticket through the caller's own handler rather than navigating itself", () => {
    const onOpen = jest.fn();
    renderActions({ onOpen });
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Open" }));
    expect(onOpen).toHaveBeenCalledWith(7);
  });

  it("copies the absolute detail link, not the bare path", () => {
    renderActions();
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Copy link" }));
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/build/1/tickets/ENG-12`);
  });

  it("copies the human key and never the numeric id", () => {
    renderActions();
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Copy key" }));
    expect(writeText).toHaveBeenCalledWith("ENG-12");
  });
});

describe("TicketQuickActions — archive is the reversible path and delete is not (FE-84)", () => {
  it("archives through the bulk mutation's archive flag, which soft-deletes the row and keeps its satellites", () => {
    renderActions();
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Archive" }));
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    expect(bulkMutate.mock.calls[0]?.[0]).toEqual({ ticketIds: [7], archive: true });
    expect(deleteMutate).not.toHaveBeenCalled();
  });

  it("reports the blocker when the server archives nothing because of active sub-tickets", () => {
    bulkMutate.mockImplementation((_vars, opts) => opts.onSuccess?.({ updated: 0, ticketIds: [], blocked: [{ ticketId: 7 }] }));
    renderActions();
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Archive" }));
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("sub-tickets"));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("confirms an archive before sending it, and sends nothing until the confirmation is accepted", () => {
    renderActions();
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Archive" }));
    expect(bulkMutate).not.toHaveBeenCalled();
    expect(screen.getByTestId("confirm")).toHaveTextContent("Archive ticket?");
  });

  it("says what delete destroys, so it is not mistaken for the archive path", () => {
    renderActions();
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
    expect(screen.getByTestId("confirm")).toHaveTextContent("Delete ticket?");
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(deleteMutate).toHaveBeenCalledWith({ ticketId: 7 });
    expect(bulkMutate).not.toHaveBeenCalled();
  });
});

describe("TicketQuickActions — a parent row can drive the menu from a right click", () => {
  it("shows the menu when the parent controls it open, without any click on the trigger", () => {
    renderActions({ open: true, onOpenChange: jest.fn() });
    expect(screen.getByRole("menuitem", { name: "Archive" })).toBeInTheDocument();
  });

  it("asks the parent to close rather than closing itself when a command runs", () => {
    const onOpenChange = jest.fn();
    renderActions({ open: true, onOpenChange });
    fireEvent.click(screen.getByRole("menuitem", { name: "Copy key" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
