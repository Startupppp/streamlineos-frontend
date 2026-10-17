import { render, screen } from "@testing-library/react";

jest.mock("@/hooks/api/build/tickets", () => ({
  useUpdateTicket: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));

import { InlineEstimate } from "./card-field-estimate";

describe("InlineEstimate hideEmpty", () => {
  it("renders nothing when empty and hideEmpty is set", () => {
    const { container } = render(
      <InlineEstimate
        ticketId={1}
        projectId={1}
        version={1}
        currentPoints={null}
        hideEmpty
      />,
    );
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText("Add pts")).not.toBeInTheDocument();
  });

  it("still shows the value when points are set", () => {
    render(
      <InlineEstimate
        ticketId={1}
        projectId={1}
        version={1}
        currentPoints={3}
        hideEmpty
      />,
    );
    expect(screen.getByText("3 pts")).toBeInTheDocument();
  });
});
