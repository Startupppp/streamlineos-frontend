import { fireEvent, render, screen } from "@testing-library/react";
import { EventAttendeesPicker } from "./event-attendees-picker";

jest.mock("@/hooks/api/calendar", () => ({
  useCalendarMemberLookup: () => ({ data: [] }),
}));
jest.mock("@/components/members/member-picker", () => ({
  MemberPicker: ({ onSearchChange }: { onSearchChange: (value: string) => void }) => (
    <input aria-label="Search attendees" onChange={(event) => onSearchChange(event.target.value)} />
  ),
}));

const members = [{ id: "u-1", firstName: "Ada", lastName: "Lovelace", name: "Ada Lovelace", email: "ada@org.test", image: null }];

describe("CAL-B-004 external guests in the attendee picker", () => {
  it("adds a typed external email as a guest chip on Enter", () => {
    const onAddGuest = jest.fn();
    render(<EventAttendeesPicker members={members} selectedIds={[]} onToggle={jest.fn()} guestEmails={[]} onAddGuest={onAddGuest} onRemoveGuest={jest.fn()} />);

    const input = screen.getByRole("textbox", { name: "Guest email" });
    fireEvent.change(input, { target: { value: " QA1015cal@Sharklasers.com " } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onAddGuest).toHaveBeenCalledWith("qa1015cal@sharklasers.com");
  });

  it("does not add an invalid email and keeps Add guest disabled", () => {
    const onAddGuest = jest.fn();
    render(<EventAttendeesPicker members={members} selectedIds={[]} onToggle={jest.fn()} guestEmails={[]} onAddGuest={onAddGuest} onRemoveGuest={jest.fn()} />);

    const input = screen.getByRole("textbox", { name: "Guest email" });
    fireEvent.change(input, { target: { value: "not-an-email" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onAddGuest).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Add guest" })).toBeDisabled();
  });

  it("offers an unmatched member search as a guest invite", () => {
    const onAddGuest = jest.fn();
    render(<EventAttendeesPicker members={members} selectedIds={[]} onToggle={jest.fn()} guestEmails={[]} onAddGuest={onAddGuest} onRemoveGuest={jest.fn()} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Search attendees" }), { target: { value: "qa1015r2@sharklasers.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Invite qa1015r2@sharklasers.com as a guest" }));

    expect(onAddGuest).toHaveBeenCalledWith("qa1015r2@sharklasers.com");
  });

  it("lists guests as removable chips", () => {
    const onRemoveGuest = jest.fn();
    render(<EventAttendeesPicker members={members} selectedIds={[]} onToggle={jest.fn()} guestEmails={["guest@example.com"]} onAddGuest={jest.fn()} onRemoveGuest={onRemoveGuest} />);

    expect(screen.getByRole("list", { name: "External guests" })).toHaveTextContent("guest@example.com");
    fireEvent.click(screen.getByRole("button", { name: "Remove guest guest@example.com" }));
    expect(onRemoveGuest).toHaveBeenCalledWith("guest@example.com");
  });
});
