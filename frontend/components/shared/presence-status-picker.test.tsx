import { render, screen, fireEvent } from "@testing-library/react";
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

jest.mock("@/hooks/api/chat-core-mutations-b", () => ({
  useSetPresenceStatus: () => ({ mutate, isPending: false }),
}));

jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (next: string) => void;
    children: React.ReactNode;
  }) => (
    <select
      aria-label="Clear after"
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
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
      expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("marks the status the server reports as current, not a hardcoded Available", () => {
    presenceMap = new Map([["me", "DO_NOT_DISTURB"]]);

    render(<PresenceStatusPicker layout="list" />);

    const current = screen.getByText("Do not disturb").closest("button");
    expect(current).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Available").closest("button")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("sends the chosen status to the server", () => {
    render(<PresenceStatusPicker layout="list" />);

    fireEvent.click(screen.getByText("On leave"));

    expect(mutate).toHaveBeenCalledWith(
      { status: "ON_LEAVE", statusMessage: "", clearAfter: "never" },
      expect.anything(),
    );
  });

  it("shows the pick immediately while the request is still in flight", () => {
    render(<PresenceStatusPicker layout="list" />);

    fireEvent.click(screen.getByText("Vacation"));

    expect(screen.getByText("Vacation").closest("button")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("renders the same options in menu layout, so the account menu and chat agree", () => {
    render(<PresenceStatusPicker layout="menu" />);

    expect(screen.getByText("Working remotely")).toBeInTheDocument();
    expect(screen.getByText("Set automatically from your activity")).toBeInTheDocument();
  });
});

describe("PresenceStatusPicker — custom status message", () => {
  it("prefills the input with the message the server already holds, rather than an empty box that looks unset", () => {
    customStatus = { statusMessage: "Heads-down until 3pm", statusExpiresAt: null };

    render(<PresenceStatusPicker layout="list" />);

    expect(screen.getByLabelText("Status message")).toHaveValue("Heads-down until 3pm");
  });

  it("sends the typed message with the current status when saved", () => {
    presenceMap = new Map([["me", "BUSY"]]);
    render(<PresenceStatusPicker layout="list" />);

    fireEvent.change(screen.getByLabelText("Status message"), {
      target: { value: "Heads-down until 3pm" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(mutate).toHaveBeenCalledWith(
      { status: "BUSY", statusMessage: "Heads-down until 3pm", clearAfter: "never" },
      expect.anything(),
    );
  });

  it("caps the input at the length the column and the backend schema accept", () => {
    render(<PresenceStatusPicker layout="list" />);

    expect(screen.getByLabelText("Status message")).toHaveAttribute("maxLength", "100");
  });

  it("carries a typed message along when a status row is clicked, so the pick does not discard it", () => {
    render(<PresenceStatusPicker layout="list" />);

    fireEvent.change(screen.getByLabelText("Status message"), {
      target: { value: "Back at 4" },
    });
    fireEvent.click(screen.getByText("In a meeting"));

    expect(mutate).toHaveBeenCalledWith(
      { status: "IN_A_MEETING", statusMessage: "Back at 4", clearAfter: "never" },
      expect.anything(),
    );
  });

  it("clears the message by sending an empty one rather than leaving a stale line on every avatar", () => {
    customStatus = { statusMessage: "Heads-down until 3pm", statusExpiresAt: null };
    render(<PresenceStatusPicker layout="list" />);

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

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
      expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("sends a NAMED duration rather than a number of minutes, so the server owns the clock", () => {
    render(<PresenceStatusPicker layout="list" />);

    fireEvent.change(screen.getByLabelText("Clear after"), { target: { value: "1h" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(mutate).toHaveBeenCalledWith(
      { status: "ONLINE", statusMessage: "", clearAfter: "1h" },
      expect.anything(),
    );
  });

  it("keeps the chosen duration when a status row is clicked", () => {
    render(<PresenceStatusPicker layout="list" />);

    fireEvent.change(screen.getByLabelText("Clear after"), { target: { value: "today" } });
    fireEvent.click(screen.getByText("Busy"));

    expect(mutate).toHaveBeenCalledWith(
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
