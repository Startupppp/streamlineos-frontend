import { render, screen } from "@testing-library/react";
import { InlineDueDate } from "./card-inline-date-fields";

jest.mock("@/hooks/api/build/tickets", () => ({
  useUpdateTicket: () => ({ mutate: jest.fn() }),
}));

it("shows the fallback placeholder when currentDueDate is null and no fallbackDate is supplied, not the ticket creation date", () => {
  render(
    <InlineDueDate
      ticketId={1}
      projectId={2}
      version={1}
      currentDueDate={null}
    />,
  );

  expect(screen.getByRole("button", { name: "Set due date" })).toHaveTextContent(
    "Due date",
  );
});

it("shows the due date string when currentDueDate is set", () => {
  render(
    <InlineDueDate
      ticketId={1}
      projectId={2}
      version={1}
      currentDueDate="2026-11-01"
    />,
  );

  expect(screen.getByRole("button", { name: "Set due date" })).toHaveTextContent(
    "Nov 1, 2026",
  );
});
