import { render, screen } from "@testing-library/react";
import { TicketSidebarMetadata } from "./ticket-sidebar-metadata";

it("renders the rank value so the user can see where the ticket sits in the backlog order", () => {
  render(<TicketSidebarMetadata timeSpent={null} originalEstimate={null} rank="a0b1" />);
  expect(screen.getByText("a0b1")).toBeInTheDocument();
});

it("omits the rank row when rank is absent, keeping the sidebar uncluttered", () => {
  render(<TicketSidebarMetadata timeSpent={null} originalEstimate={null} />);
  expect(screen.queryByText("Rank")).not.toBeInTheDocument();
});
