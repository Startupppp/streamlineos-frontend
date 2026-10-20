import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SupportInboxPage } from "./support-inbox-page";

let search = "";
jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(search),
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/support/inbox",
}));

jest.mock("next/dynamic", () => () =>
  function DynamicStub(props: { ticketId?: number; onBack?: () => void }) {
    if (props.ticketId === undefined) return null;
    return (
      <div>
        <p>Ticket detail {props.ticketId}</p>
        <button type="button" onClick={props.onBack}>
          Back to list
        </button>
      </div>
    );
  },
);

jest.mock("@/hooks/api/support", () => ({
  useSupportTickets: () => ({
    data: { items: [{ id: 7 }, { id: 42 }], total: 2 },
    isError: false,
    isLoading: false,
    access: { pending: false, denied: false },
    refetch: jest.fn(),
  }),
  useSupportStats: () => ({ data: undefined, isLoading: false }),
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => ({ data: {}, isError: false, refetch: jest.fn() }),
}));

jest.mock("@/features/support/inbox/ticket-list", () => ({
  TicketList: ({ tickets, onSelect }: { tickets: { id: number }[]; onSelect: (id: number) => void }) => (
    <ul>
      {tickets.map((ticket) => (
        <li key={ticket.id}>
          <button type="button" onClick={() => onSelect(ticket.id)}>
            Open ticket {ticket.id}
          </button>
        </li>
      ))}
    </ul>
  ),
}));

jest.mock("@/features/support/inbox/queue-view-rail", () => ({ QueueViewRail: () => null }));
jest.mock("@/features/support/inbox/agent-availability-toggle", () => ({ AgentAvailabilityToggle: () => null }));
jest.mock("@/features/support/inbox/use-inbox-shortcuts", () => ({ useInboxShortcuts: jest.fn() }));
jest.mock("@/hooks/common/use-query-param-open", () => ({
  useQueryParamOpen: () => ({ open: false, onOpenChange: jest.fn(), setOpen: jest.fn() }),
}));
jest.mock("@/components/layout/shell-variant-context", () => ({ useShellVariant: () => "desktop" }));
jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const replaceState = jest.spyOn(window.history, "replaceState");

afterEach(() => {
  search = "";
  replaceState.mockClear();
});

describe("support inbox ticket deep link", () => {
  it("opens the ticket named by ?ticket=, so a chat link lands on it", () => {
    search = "ticket=42";
    render(<SupportInboxPage />);
    expect(screen.getByText("Ticket detail 42")).toBeInTheDocument();
  });

  it("ignores a ticket param that is not a positive id", () => {
    search = "ticket=abc";
    render(<SupportInboxPage />);
    expect(screen.queryByText(/Ticket detail/)).not.toBeInTheDocument();
    expect(screen.getByText("Select a ticket")).toBeInTheDocument();
  });

  it("writes a clicked ticket into the URL without a navigation, keeping the other filters", async () => {
    search = "status=OPEN";
    render(<SupportInboxPage />);
    await userEvent.click(screen.getByRole("button", { name: "Open ticket 7" }));
    expect(replaceState).toHaveBeenCalledWith(null, "", "/support/inbox?status=OPEN&ticket=7");
  });

  it("drops the param when the agent goes back to the list", async () => {
    search = "status=OPEN&ticket=42";
    render(<SupportInboxPage />);
    await userEvent.click(screen.getByRole("button", { name: "Back to list" }));
    expect(replaceState).toHaveBeenCalledWith(null, "", "/support/inbox?status=OPEN");
  });
});
