import { render, screen } from "@testing-library/react";

jest.mock("next/navigation", () => ({ notFound: () => { throw new Error("NEXT_NOT_FOUND"); } }));
jest.mock("@/lib/rbac/route-access/enforce-route-access", () => ({ enforceRouteAccess: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/features/build/ticket-details/ticket-panel-inner", () => ({
  TicketPanelInner: ({ projectId, ticketKey, returnTo }: { projectId: number; ticketKey: string; returnTo: string | null }) => (
    <div>My Work pane {projectId}:{ticketKey} return {returnTo}</div>
  ),
}));

import MyWorkLayout from "./layout";
import PanelFallback from "./@panel/default";
import InterceptedTicketRoute from "./@panel/(..)[projectId]/tickets/[ticketKey]/page";

it("keeps My Work mounted beside the intercepted ticket pane", async () => {
  const panel = await InterceptedTicketRoute({
    params: Promise.resolve({ projectId: "1", ticketKey: "STRE-35" }),
    searchParams: Promise.resolve({ returnTo: "/build/my-work?q=QA-070" }),
  });
  render(<MyWorkLayout panel={panel}>My Work list</MyWorkLayout>);
  expect(screen.getByText("My Work list")).toBeInTheDocument();
  expect(screen.getByText("My Work pane 1:STRE-35 return /build/my-work?q=QA-070")).toBeInTheDocument();
});

it("renders no pane on a direct My Work load", () => {
  render(<MyWorkLayout panel={<PanelFallback />}>My Work list</MyWorkLayout>);
  expect(screen.getByText("My Work list")).toBeInTheDocument();
  expect(screen.queryByText(/My Work pane/)).not.toBeInTheDocument();
});
