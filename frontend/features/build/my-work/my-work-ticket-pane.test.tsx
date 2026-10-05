import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UsePageStateOptions } from "@/hooks/api/use-page-state";
import { resolvePageState } from "@/lib/page-state/resolve-page-state";

const mockPush = jest.fn();
const mockRefetchTicket = jest.fn();
let mockTicketError: Error | null = null;
let mockIsLoading = false;
let mockTicket: { id: number; title: string; status: string; priority: string; description: string } | null = null;

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("../ticket-details/use-ticket-detail", () => ({
  useTicketDetail: () => ({
    ticket: mockTicket,
    isLoading: mockIsLoading,
    ticketError: mockTicketError,
    refetchTicket: mockRefetchTicket,
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
  usePageState: ({ isLoading, isError, error, isEmpty }: UsePageStateOptions) => resolvePageState({ isLoading, isError, error, isEmpty, access: "granted" }),
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
    mockRefetchTicket.mockClear();
    mockTicketError = null;
    mockIsLoading = false;
    mockTicket = null;
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

  it("retries a failed detail read inside the pane and renders the recovered ticket", async () => {
    mockTicketError = new TypeError("Failed to fetch");
    const view = render(<TicketDetailPane ticketId={1} projectId={1} originHref="/build/my-work?tab=assigned" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(mockRefetchTicket).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
    mockTicketError = null;
    mockTicket = { id: 1, title: "Recovered ticket", status: "TODO", priority: "HIGH", description: "" };
    view.rerender(<TicketDetailPane ticketId={1} projectId={1} originHref="/build/my-work?tab=assigned" />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getAllByText("Recovered ticket")).toHaveLength(2);
    await userEvent.click(screen.getByRole("button", { name: /close ticket pane/i }));
    expect(mockPush).toHaveBeenCalledWith("/build/my-work?tab=assigned", { scroll: false });
  });
});
