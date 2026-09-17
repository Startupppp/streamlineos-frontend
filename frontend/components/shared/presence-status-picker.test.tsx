import { render, screen, fireEvent } from "@testing-library/react";
import { PresenceStatusPicker } from "./presence-status-picker";

const mutate = jest.fn();
let presenceMap = new Map<string, string>();

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "me" } } }),
}));

jest.mock("@/hooks/api/chat-core-read", () => ({
  usePresenceMap: () => presenceMap,
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

beforeEach(() => {
  mutate.mockClear();
  presenceMap = new Map();
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

    expect(mutate).toHaveBeenCalledWith("ON_LEAVE", expect.anything());
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
