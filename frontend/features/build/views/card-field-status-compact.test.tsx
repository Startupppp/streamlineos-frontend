import { fireEvent, render, screen } from "@testing-library/react";
import { InlineStatus } from "./card-field-status";

const mockMutate = jest.fn();
jest.mock("@/hooks/api/build/tickets", () => ({ useUpdateTicket: () => ({ mutate: mockMutate, isPending: false }) }));

describe("compact InlineStatus", () => {
  beforeEach(() => mockMutate.mockClear());

  it("keeps the configured state color and hides verbose text on the trigger", () => {
    render(<InlineStatus ticketId={35} projectId={1} version={4} currentStatus="CODE_REVIEW" projectStatuses={[{ name: "CODE_REVIEW", color: "#8b5cf6", type: "started" }]} compact />);
    const button = screen.getByRole("button", { name: "Change status: CODE REVIEW" });
    expect(button).not.toHaveTextContent("CODE REVIEW");
    expect(button.querySelector("[aria-hidden='true']")).toHaveStyle({ backgroundColor: "#8b5cf6" });
  });

  it("uses the existing status mutation with the original project and concurrency version", () => {
    render(<InlineStatus ticketId={35} projectId={1} version={4} currentStatus="TODO" compact />);
    fireEvent.click(screen.getByRole("button", { name: "Change status: To Do" }));
    fireEvent.click(screen.getByRole("button", { name: "In Progress" }));
    expect(mockMutate).toHaveBeenCalledWith({ ticketId: 35, version: 4, status: "IN_PROGRESS" });
  });
});
