import { render, screen } from "@testing-library/react";
import { InlineEstimate } from "./card-field-estimate";

jest.mock("@/hooks/api/build/tickets", () => ({
  useUpdateTicket: () => ({ mutate: jest.fn() }),
}));

it("renders zero points distinctly from an unset estimate", () => {
  const { rerender } = render(
    <InlineEstimate ticketId={1} projectId={2} currentPoints={0} />,
  );

  expect(screen.getByRole("button", { name: "Change estimate" })).toHaveTextContent(
    "0 pts",
  );

  rerender(<InlineEstimate ticketId={1} projectId={2} currentPoints={null} />);

  expect(screen.getByRole("button", { name: "Change estimate" })).toHaveTextContent(
    "pts",
  );
  expect(screen.getByRole("button", { name: "Change estimate" })).not.toHaveTextContent(
    "0 pts",
  );
});
