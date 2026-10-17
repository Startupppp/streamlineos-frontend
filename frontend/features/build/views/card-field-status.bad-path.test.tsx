import { fireEvent, render, screen } from "@testing-library/react";

const mutate = jest.fn();
let isPending = false;

jest.mock("@/hooks/api/build/tickets", () => ({
  useUpdateTicket: () => ({ mutate, isPending }),
}));

jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));

import { InlineStatus } from "./card-field-status";

describe("InlineStatus — bad paths and double submit", () => {
  beforeEach(() => {
    mutate.mockClear();
    isPending = false;
  });

  it("does not fire a second mutate while a status change is pending", () => {
    isPending = true;
    render(
      <InlineStatus
        ticketId={1}
        projectId={1}
        version={1}
        currentStatus="TODO"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Change status" }));
    expect(mutate).not.toHaveBeenCalled();
  });

  it("disables the status trigger while pending so the control is not stuck open", () => {
    isPending = true;
    render(
      <InlineStatus
        ticketId={1}
        projectId={1}
        version={1}
        currentStatus="TODO"
      />,
    );
    expect(screen.getByRole("button", { name: "Change status" })).toBeDisabled();
  });

  it("mutates once on the happy path when idle", async () => {
    render(
      <InlineStatus
        ticketId={1}
        projectId={1}
        version={1}
        currentStatus="TODO"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Change status" }));
    fireEvent.click(await screen.findByRole("button", { name: /In Progress|IN_PROGRESS/i }));
    expect(mutate).toHaveBeenCalledTimes(1);
  });
});
