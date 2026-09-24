import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { TicketDetailRightPanel } from "./ticket-detail-right-panel";

jest.mock("framer-motion", () => ({ useReducedMotion: () => false }));
jest.mock("@/hooks/common/use-mobile", () => ({ useIsMobile: () => true }));
jest.mock("@/components/ui/drawer", () => ({
  Drawer: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <div role="dialog">{children}</div> : null,
  DrawerContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DrawerHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DrawerTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
jest.mock("./ticket-sidebar", () => ({ TicketSidebar: () => null }));
jest.mock("./ticket-time-tracker", () => ({ TicketTimeTracker: () => null }));
jest.mock("./watcher-list", () => ({ WatcherList: () => null }));
jest.mock("./ticket-git-links", () => ({ TicketGitLinks: () => null }));

it("closes the mobile properties drawer from its visible close control", () => {
  const onOpenChange = jest.fn();

  render(
    <TicketDetailRightPanel
      open
      onOpenChange={onOpenChange}
      displayKey="TEST-1"
      saving={false}
      ticket={{ id: 1 }}
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
