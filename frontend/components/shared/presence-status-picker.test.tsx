import { act, render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PresenceStatusPicker } from "./presence-status-picker";

const mutate = jest.fn();
let presenceMap = new Map<string, string>();
let customStatus: { statusMessage: string | null; statusExpiresAt: string | null } = {
  statusMessage: null,
  statusExpiresAt: null,
};

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "me" } } }),
}));

jest.mock("@/hooks/api/chat-core-read", () => ({
  usePresenceMap: () => presenceMap,
  usePresenceCustomStatus: () => customStatus,
}));

jest.mock("@/hooks/api/chat-presence", () => ({
  useSetPresenceStatus: () => ({ mutate, isPending: false }),
}));

beforeEach(() => {
  mutate.mockClear();
  presenceMap = new Map();
  customStatus = { statusMessage: null, statusExpiresAt: null };
});

describe("PresenceStatusPicker", () => {
  it("offers every manual status, so a member can pick more than the three activity-derived ones", () => {
    render(<PresenceStatusPicker layout="list" />);

    for (const label of [
      "Busy",
      "Do not disturb",
      "In a meeting",
      "On leave",
      "Vacation",
      "Working remotely",
    ])
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
  });

  it("marks the status the server reports as current, not a hardcoded Available", () => {
    presenceMap = new Map([["me", "DO_NOT_DISTURB"]]);

    render(<PresenceStatusPicker layout="list" />);

    expect(screen.getByRole("button", { name: "Do not disturb" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Available" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("sends the chosen status to the server without a separate save click", () => {
    render(<PresenceStatusPicker layout="list" />);

    fireEvent.click(screen.getByRole("button", { name: "On leave" }));

    expect(mutate).toHaveBeenCalledWith(
      { status: "ON_LEAVE", statusMessage: "", clearAfter: "never" },
      expect.anything(),
    );
  });

  it("shows the pick immediately while the request is still in flight", () => {
    render(<PresenceStatusPicker layout="list" />);

    fireEvent.click(screen.getByRole("button", { name: "Vacation" }));

    expect(screen.getByRole("button", { name: "Vacation" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("releases the optimistic pick on mutation success so later server state wins", () => {
    const { rerender } = render(<PresenceStatusPicker layout="list" />);

    fireEvent.click(screen.getByRole("button", { name: "Vacation" }));
    expect(screen.getByRole("button", { name: "Vacation" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    const callbacks = mutate.mock.calls[0]?.[1] as { onSuccess?: () => void };
    act(() => callbacks.onSuccess?.());
    presenceMap = new Map([["me", "BUSY"]]);
    rerender(<PresenceStatusPicker layout="list" />);

    expect(screen.getByRole("button", { name: "Busy" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("renders the same options in menu layout, so the account menu and chat agree", () => {
    render(
      <DropdownMenu open>
        <DropdownMenuTrigger>Account menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <PresenceStatusPicker layout="menu" />
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    expect(screen.getByRole("menuitemradio", { name: "Working remotely" })).toBeInTheDocument();
    expect(screen.getByRole("menuitemradio", { name: "Available" })).toBeInTheDocument();
  });
});

describe("PresenceStatusPicker — custom status message", () => {
  it("prefills the input with the message the server already holds, rather than an empty box that looks unset", () => {
    customStatus = { statusMessage: "Heads-down until 3pm", statusExpiresAt: null };

    render(<PresenceStatusPicker layout="list" />);

    expect(screen.getByLabelText("Status message")).toHaveValue("Heads-down until 3pm");
  });

  it("replaces a stale draft when a different server message arrives", () => {
    customStatus = { statusMessage: "First status", statusExpiresAt: null };
    const view = render(<PresenceStatusPicker layout="list" />);
    fireEvent.change(screen.getByLabelText("Status message"), {
      target: { value: "Unsaved draft" },
    });

    customStatus = { statusMessage: "Updated elsewhere", statusExpiresAt: null };
    view.rerender(<PresenceStatusPicker layout="list" />);

    expect(screen.getByLabelText("Status message")).toHaveValue("Updated elsewhere");
  });

  it("sends the typed message with the current status when the field blurs", () => {
    presenceMap = new Map([["me", "BUSY"]]);
    render(<PresenceStatusPicker layout="list" />);

    fireEvent.change(screen.getByLabelText("Status message"), {
      target: { value: "Heads-down until 3pm" },
    });
    fireEvent.blur(screen.getByLabelText("Status message"));

    expect(mutate).toHaveBeenCalledWith(
      { status: "BUSY", statusMessage: "Heads-down until 3pm", clearAfter: "never" },
      expect.anything(),
    );
  });

  it("caps the input at the length the column and the backend schema accept", () => {
    render(<PresenceStatusPicker layout="list" />);

    expect(screen.getByLabelText("Status message")).toHaveAttribute("maxLength", "100");
  });

  it("carries a typed message along when a status chip is clicked, so the pick does not discard it", () => {
    render(<PresenceStatusPicker layout="list" />);

    fireEvent.change(screen.getByLabelText("Status message"), {
      target: { value: "Back at 4" },
    });
    fireEvent.click(screen.getByRole("button", { name: "In a meeting" }));

    expect(mutate).toHaveBeenCalledWith(
      { status: "IN_A_MEETING", statusMessage: "Back at 4", clearAfter: "never" },
      expect.anything(),
    );
  });

  it("clears the message by sending an empty one when the field is emptied and blurred", () => {
    customStatus = { statusMessage: "Heads-down until 3pm", statusExpiresAt: null };
    render(<PresenceStatusPicker layout="list" />);

    fireEvent.change(screen.getByLabelText("Status message"), {
      target: { value: "" },
    });
    fireEvent.blur(screen.getByLabelText("Status message"));

    expect(mutate).toHaveBeenCalledWith(
      { status: "ONLINE", statusMessage: "", clearAfter: "never" },
      expect.anything(),
    );
  });
});

describe("PresenceStatusPicker — auto-clear duration", () => {
  it("offers the four durations the product asks for", () => {
    render(<PresenceStatusPicker layout="list" />);

    for (const label of ["1 hour", "Today", "This week", "Until I clear it"])
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
  });

  it("sends a NAMED duration rather than a number of minutes, so the server owns the clock", () => {
    render(<PresenceStatusPicker layout="list" />);

    fireEvent.click(screen.getByRole("button", { name: "1 hour" }));

    expect(mutate).toHaveBeenCalledWith(
      { status: "ONLINE", statusMessage: "", clearAfter: "1h" },
      expect.anything(),
    );
  });

  it("keeps the chosen duration when a status chip is clicked", () => {
    render(<PresenceStatusPicker layout="list" />);

    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    fireEvent.click(screen.getByRole("button", { name: "Busy" }));

    expect(mutate).toHaveBeenLastCalledWith(
      { status: "BUSY", statusMessage: "", clearAfter: "today" },
      expect.anything(),
    );
  });

  it("tells the member when an active status expires instead of leaving the expiry invisible", () => {
    customStatus = {
      statusMessage: "Heads-down until 3pm",
      statusExpiresAt: "2026-09-18T15:00:00.000Z",
    };

    render(<PresenceStatusPicker layout="list" />);

    expect(screen.getByText(/^Clears /)).toBeInTheDocument();
  });

  it("says a status with no expiry stands until it is cleared", () => {
    customStatus = { statusMessage: "On the road", statusExpiresAt: null };

    render(<PresenceStatusPicker layout="list" />);

    expect(screen.getByText("Stays until you clear it")).toBeInTheDocument();
  });
});

describe("PresenceStatusPicker inside the account menu (ORG UX keyboard)", () => {
  function renderInMenu() {
    render(
      <DropdownMenu open>
        <DropdownMenuTrigger>Account menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <PresenceStatusPicker layout="menu" />
        </DropdownMenuContent>
      </DropdownMenu>,
    );
  }

  it("exposes each availability and clear-after choice as a menu radio item with its checked state", () => {
    presenceMap = new Map([["me", "BUSY"]]);
    renderInMenu();
    expect(screen.getByRole("menuitemradio", { name: "Busy" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("menuitemradio", { name: "Available" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("group", { name: "Clear after" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Busy" })).not.toBeInTheDocument();
  });

  it("selects a status from the keyboard and keeps the menu open", async () => {
    renderInMenu();
    const onLeave = screen.getByRole("menuitemradio", { name: "On leave" });
    onLeave.focus();
    await userEvent.keyboard("{Enter}");
    expect(mutate).toHaveBeenCalledWith(
      { status: "ON_LEAVE", statusMessage: "", clearAfter: "never" },
      expect.anything(),
    );
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("moves between choices with the arrow keys", async () => {
    renderInMenu();
    const items = screen.getAllByRole("menuitemradio");
    items[0]?.focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(items[1]).toHaveFocus();
  });

  it("lays the picker out as three rows, with the long rows scrolling sideways", () => {
    renderInMenu();
    const availability = screen.getByRole("group", { name: "Availability" });
    const clearAfter = screen.getByRole("group", { name: "Clear after" });
    const message = screen.getByLabelText("Status message");

    expect(availability).toHaveClass("overflow-x-auto", "scrollbar-hide", "flex-nowrap");
    expect(availability).not.toHaveClass("grid-cols-2", "flex-wrap");
    expect(clearAfter).toHaveClass("overflow-x-auto", "scrollbar-hide", "flex-nowrap");
    expect(message.compareDocumentPosition(availability) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(0);
    expect(message.compareDocumentPosition(clearAfter) & Node.DOCUMENT_POSITION_PRECEDING).toBe(0);
  });
});
