import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

let mockSearchParams = new URLSearchParams();
jest.mock("next/navigation", () => ({
  usePathname: () => "/build/1/tickets/123", useSearchParams: () => mockSearchParams,
  notFound: () => { throw new Error("NEXT_NOT_FOUND"); },
}));
jest.mock("@/hooks/api/build/ticket-queries", () => ({
  useTicketByKey: () => ({ data: { id: 980, project: { key: "STRE" } }, isLoading: false, isError: false, error: null, refetch: jest.fn() }),
}));
jest.mock("@/hooks/api/use-page-state", () => ({ usePageState: () => ({ kind: "ready" }) }));
jest.mock("@/components/shared/page-state", () => ({ PageState: ({ children }: { children: ReactNode }) => <>{children}</> }));
jest.mock("./ticket-detail-page", () => ({
  TicketDetailPage: ({ projectId, ticketKey }: { projectId: number; ticketKey: string }) => <div>Full details {projectId}:{ticketKey}</div>,
}));
jest.mock("./ticket-detail-pane", () => ({ TicketDetailPane: () => <div>Ticket preview</div> }));

import { TicketPanelInner } from "./ticket-panel-inner";

it("uses the full detail composer instead of the preview for saved draft navigation", () => {
  mockSearchParams = new URLSearchParams("draft=resume");
  render(<TicketPanelInner projectId={1} ticketKey="123" returnTo="/build/my-work?section=drafts" />);
  expect(screen.getByText("Full details 1:123")).toBeInTheDocument();
  expect(screen.queryByText("Ticket preview")).not.toBeInTheDocument();
});

it("retains the preview for ordinary ticket navigation", () => {
  mockSearchParams = new URLSearchParams();
  render(<TicketPanelInner projectId={1} ticketKey="123" returnTo="/build/my-work" />);
  expect(screen.getByText("Ticket preview")).toBeInTheDocument();
  expect(screen.queryByText("Full details 1:123")).not.toBeInTheDocument();
});
