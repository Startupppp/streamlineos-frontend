import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { TicketDetailRightPanel } from "./ticket-detail-right-panel";

const mockUseCan = jest.fn(() => true);
const mockUpdateVisibilityMutate = jest.fn();

jest.mock("@/hooks/api/build/client-portal", () => ({
  useUpdateTicketVisibility: jest.fn(() => ({ mutate: mockUpdateVisibilityMutate, isPending: false })),
}));
jest.mock("@/components/ui/switch", () => ({
  Switch: ({ checked, onCheckedChange, "aria-label": ariaLabel, disabled }: { checked: boolean; onCheckedChange: (v: boolean) => void; "aria-label"?: string; disabled?: boolean }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
    />
  ),
}));
jest.mock("framer-motion", () => ({ useReducedMotion: () => false }));
jest.mock("@/hooks/common/use-mobile", () => ({ useIsMobile: () => true }));
jest.mock("@/hooks/api/access", () => ({ useCan: (...args: unknown[]) => mockUseCan(...args) }));
jest.mock("@/components/ui/drawer", () => ({
  Drawer: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <div role="dialog">{children}</div> : null,
  DrawerContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DrawerHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DrawerTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
jest.mock("@/components/shared/ticket-status-badge", () => ({
  StatusBadge: ({ status }: { status: string }) => <span data-testid="status-badge">{status}</span>,
}));
jest.mock("../shared/priority-badge", () => ({
  PriorityBadge: ({ priority }: { priority: string }) => <span data-testid="priority-badge">{priority}</span>,
}));
jest.mock("./ticket-sidebar", () => ({ TicketSidebar: () => null }));
jest.mock("./ticket-time-tracker", () => ({
  TicketTimeTracker: ({ ticketId }: { ticketId: number }) => (
    <div data-testid="time-tracker" data-ticketid={String(ticketId)} />
  ),
}));
jest.mock("./watcher-list", () => ({ WatcherList: () => null }));
jest.mock("./ticket-git-links", () => ({ TicketGitLinks: () => null }));
jest.mock("./ticket-related-links", () => ({ TicketRelatedLinks: () => null }));

beforeEach(() => {
  mockUseCan.mockReset();
  mockUseCan.mockReturnValue(true);
  mockUpdateVisibilityMutate.mockReset();
});

function renderPanel(open = true) {
  return render(
    <TicketDetailRightPanel
      open={open}
      onOpenChange={jest.fn()}
      displayKey="TEST-1"
      saving={false}
      ticket={{ id: 1, version: 3 }}
      ticketId={1}
      projectId={9}
      onAutoSave={jest.fn()}
      canUpdate
      canAssign
    />,
  );
}

it("closes the mobile properties drawer from its visible close control", () => {
  const onOpenChange = jest.fn();

  render(
    <TicketDetailRightPanel
      open
      onOpenChange={onOpenChange}
      displayKey="TEST-1"
      saving={false}
      ticket={{ id: 1, version: 3 }}
      ticketId={1}
      projectId={9}
      onAutoSave={jest.fn()}
      canUpdate
      canAssign
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "Close details panel" }));

  expect(onOpenChange).toHaveBeenCalledWith(false);
});

it("renders the time tracker when the actor has build:timesheets:view", () => {
  mockUseCan.mockImplementation((key: string) => key === "build:timesheets:view");
  renderPanel();
  expect(screen.getByTestId("time-tracker")).toBeInTheDocument();
});

it("hides the time tracker when the actor lacks build:timesheets:view", () => {
  mockUseCan.mockImplementation((key: string) => key !== "build:timesheets:view");
  renderPanel();
  expect(screen.queryByTestId("time-tracker")).not.toBeInTheDocument();
});

it("renders the status badge with the ticket status and the priority badge with the ticket priority", () => {
  renderPanel();
  expect(screen.getByTestId("status-badge")).toHaveTextContent("TODO");
  expect(screen.getByTestId("priority-badge")).toHaveTextContent("MEDIUM");
});

it("renders the Share with Client toggle when the actor has build:clientvisibility:manage", () => {
  mockUseCan.mockImplementation((key: string) => key === "build:clientvisibility:manage");
  renderPanel();
  expect(screen.getByRole("switch", { name: "Share this ticket with the client portal" })).toBeInTheDocument();
});

it("hides the Share with Client toggle when the actor lacks build:clientvisibility:manage", () => {
  mockUseCan.mockImplementation((key: string) => key !== "build:clientvisibility:manage");
  renderPanel();
  expect(screen.queryByRole("switch", { name: "Share this ticket with the client portal" })).not.toBeInTheDocument();
});

it("calls updateVisibility.mutate with the new clientVisible state when the toggle is clicked", () => {
  mockUseCan.mockImplementation((key: string) => key === "build:clientvisibility:manage");
  render(
    <TicketDetailRightPanel
      open
      onOpenChange={jest.fn()}
      displayKey="TEST-1"
      saving={false}
      ticket={{ id: 1, version: 3, clientVisible: false }}
      ticketId={1}
      projectId={9}
      onAutoSave={jest.fn()}
      canUpdate
      canAssign
    />,
  );
  fireEvent.click(screen.getByRole("switch", { name: "Share this ticket with the client portal" }));
  expect(mockUpdateVisibilityMutate).toHaveBeenCalledWith({ ticketId: 1, clientVisible: true, version: 3 });
});
