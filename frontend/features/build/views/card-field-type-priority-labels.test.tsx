import { render, screen } from "@testing-library/react";
import { InlineType } from "./card-inline-type-cycle";
import { InlinePriority } from "./card-field-priority";

jest.mock("@/hooks/api/build/tickets", () => ({ useUpdateTicket: () => ({ mutate: jest.fn(), isPending: false }) }));

describe("icon-only Type and Priority triggers name their current value", () => {
  it("the type trigger's accessible name and tooltip carry the current type", () => {
    render(<InlineType ticketId={1} projectId={1} version={1} currentType="BUG" />);
    const button = screen.getByRole("button", { name: "Change type: Bug" });
    expect(button).toHaveAttribute("title", "Bug");
  });

  it("the priority trigger's accessible name carries the current priority", () => {
    render(<InlinePriority ticketId={1} projectId={1} version={1} currentPriority="HIGH" />);
    expect(screen.getByRole("button", { name: "Change priority: High" })).toBeInTheDocument();
  });
});
