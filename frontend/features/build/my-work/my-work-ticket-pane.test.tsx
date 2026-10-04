import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("../ticket-details/use-ticket-detail", () => ({
  useTicketDetail: () => ({
    ticket: null,
    isLoading: false,
    ticketError: null,
    refetchTicket: jest.fn(),
    projectData: null,
    subtasks: [],
    members: [],
    statuses: [],
    saving: false,
    conflict: null,
    keepConflictingEdit: jest.fn(),
    discardConflictingEdit: jest.fn(),
    localTitle: "",
    handleTitleChange: jest.fn(),
    handleDescriptionEditorChange: jest.fn(),
    autoSave: jest.fn(),
    handleDelete: jest.fn(),
    isDeleting: false,
  }),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => ({ kind: "ready" }),
}));

jest.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div data-testid="sheet">{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div data-testid="sheet-content">{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/components/shared/ticket-status-badge", () => ({
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

jest.mock("@/features/build/shared/priority-badge", () => ({
  PriorityBadge: ({ priority }: { priority: string | null }) => <span>{priority}</span>,
}));

import { TicketDetailPane } from "../ticket-details/ticket-detail-pane";

describe("TicketDetailPane", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("renders the pane without crashing", () => {
    render(
      <TicketDetailPane ticketId={1} projectId={1} originHref="/build/my-work" />,
    );
    expect(screen.getByTestId("sheet")).toBeInTheDocument();
  });

  it("navigates back to the origin URL when close button is clicked", async () => {
    render(
      <TicketDetailPane
        ticketId={1}
        projectId={1}
        originHref="/build/my-work?tab=assigned"
      />,
    );
    const closeButton = screen.getByRole("button", { name: /close ticket pane/i });
    await userEvent.click(closeButton);
    expect(mockPush).toHaveBeenCalledWith(
      "/build/my-work?tab=assigned",
      { scroll: false },
    );
  });

  it("includes the ticket pane label in the header", () => {
    render(
      <TicketDetailPane ticketId={42} projectId={5} originHref="/build/my-work" />,
    );
    expect(screen.getByText("Ticket")).toBeInTheDocument();
  });
});
