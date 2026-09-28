import { fireEvent, render, screen } from "@testing-library/react";
import { TicketConflictDialog } from "./ticket-conflict-dialog";

let mockCanUpdate = true;

jest.mock("@/hooks/api/access", () => ({
  useCan: () => mockCanUpdate,
}));

const fields = [
  { key: "status", label: "Status", serverValue: "DONE", pendingValue: "IN_PROGRESS" },
];

beforeEach(() => {
  mockCanUpdate = true;
});

it("offers the overwrite control to a user who may update the ticket", () => {
  const onKeepMine = jest.fn();
  render(
    <TicketConflictDialog
      open
      fields={fields}
      onKeepMine={onKeepMine}
      onDiscard={jest.fn()}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "Keep my changes" }));

  expect(onKeepMine).toHaveBeenCalledTimes(1);
});

it("withholds the overwrite control from a user who may not update the ticket", () => {
  mockCanUpdate = false;
  render(
    <TicketConflictDialog
      open
      fields={fields}
      onKeepMine={jest.fn()}
      onDiscard={jest.fn()}
    />,
  );

  expect(screen.queryByRole("button", { name: "Keep my changes" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Discard my changes" })).toBeInTheDocument();
  expect(screen.getByText("Status")).toBeInTheDocument();
});

it("treats dismissing the comparison as discarding the pending edit", () => {
  const onDiscard = jest.fn();
  render(
    <TicketConflictDialog
      open
      fields={fields}
      onKeepMine={jest.fn()}
      onDiscard={onDiscard}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "Close" }));

  expect(onDiscard).toHaveBeenCalledTimes(1);
});
