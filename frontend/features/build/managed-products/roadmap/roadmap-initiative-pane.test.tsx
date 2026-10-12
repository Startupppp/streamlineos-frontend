import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import type { ScoredRoadmapItem } from "@/hooks/api/build/roadmap";

let mockSearchParams = new URLSearchParams();
const mockReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/build/products/7/roadmap",
}));

let mockItem: ScoredRoadmapItem | undefined = undefined;
let mockIsLoading = false;

jest.mock("@/hooks/api/build/roadmap", () => ({
  useRoadmapItem: () => ({ data: mockItem, isLoading: mockIsLoading }),
}));

jest.mock("@/features/build/ticket-details/ticket-detail-pane", () => ({
  TicketDetailPane: ({ ticketId, projectId, originHref }: { ticketId: number; projectId: number; originHref: string }) => (
    <div data-testid="ticket-detail-pane" data-ticket-id={ticketId} data-project-id={projectId} data-origin={originHref} />
  ),
}));

jest.mock("@/features/build/managed-products/insights/opportunity-pane", () => ({
  OpportunityPane: ({ managedProductId, opportunityId }: { managedProductId: number; opportunityId: number }) => (
    <div data-testid="opportunity-pane" data-product-id={managedProductId} data-opp-id={opportunityId} />
  ),
}));

jest.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open, onOpenChange }: { children: React.ReactNode; open: boolean; onOpenChange: (o: boolean) => void }) => (
    <div data-testid="sheet" data-open={String(open)} onClick={() => onOpenChange(false)}>{children}</div>
  ),
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  SheetBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>{children}</button>
  ),
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

jest.mock("@/features/build/roadmap/roadmap-constants", () => ({
  ROADMAP_STATUS_BADGE_VARIANT: { planned: "outline" },
  ROADMAP_STATUS_LABEL: { planned: "Planned" },
  ROADMAP_HORIZON_LABEL: { now: "Now", next: "Next", later: "Later" },
}));

jest.mock("@/lib/person-display", () => ({
  getUserDisplayName: (u: { firstName: string }) => u.firstName,
}));

function makeItem(overrides: Partial<ScoredRoadmapItem> = {}): ScoredRoadmapItem {
  return {
    id: 42,
    orgId: "org-1",
    title: "Fast checkout",
    description: null,
    outcome: null,
    status: "planned",
    category: null,
    isPublic: false,
    projectId: null,
    managedProductId: 7,
    epicTicketId: null,
    targetQuarter: null,
    sortOrder: 1,
    votes: 0,
    reach: null,
    impact: null,
    confidence: null,
    effort: null,
    ownerMembershipId: null,
    owner: null,
    horizon: "now",
    goalId: null,
    releaseId: null,
    teamId: null,
    opportunityId: null,
    targetStart: null,
    targetEnd: null,
    decisionSnapshot: null,
    goal: null,
    release: null,
    team: null,
    opportunity: null,
    prioritization: {} as ScoredRoadmapItem["prioritization"],
    tierWeighting: {} as ScoredRoadmapItem["tierWeighting"],
    delivery: {} as ScoredRoadmapItem["delivery"],
    allowedActions: ["edit", "delete", "move", "reorder"],
    sourceFreshness: null,
    version: 1,
    createdBy: null,
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
    ...overrides,
  } as ScoredRoadmapItem;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSearchParams = new URLSearchParams();
  mockItem = undefined;
  mockIsLoading = false;
});

import { RoadmapInitiativePane } from "./roadmap-initiative-pane";

describe("RoadmapInitiativePane — deep link opens pane", () => {
  it("renders the sheet open when itemId is set", () => {
    mockItem = makeItem();
    render(<RoadmapInitiativePane itemId={42} />);
    expect(screen.getByTestId("sheet")).toHaveAttribute("data-open", "true");
  });

  it("renders the sheet closed when itemId is null", () => {
    render(<RoadmapInitiativePane itemId={null} />);
    expect(screen.getByTestId("sheet")).toHaveAttribute("data-open", "false");
  });

  it("shows the item title when loaded", () => {
    mockItem = makeItem({ title: "Fast checkout" });
    render(<RoadmapInitiativePane itemId={42} />);
    expect(screen.getByRole("heading")).toHaveTextContent("Fast checkout");
  });

  it("shows skeletons while loading", () => {
    mockIsLoading = true;
    render(<RoadmapInitiativePane itemId={42} />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });
});

describe("RoadmapInitiativePane — closing removes only ?item", () => {
  it("removes only ?item from URL when pane is closed, preserving other params", () => {
    mockSearchParams = new URLSearchParams("item=42&view=board&sort=priority");
    mockItem = makeItem();
    render(<RoadmapInitiativePane itemId={42} />);
    fireEvent.click(screen.getByTestId("sheet"));
    const url = mockReplace.mock.calls[0][0] as string;
    expect(url).toContain("view=board");
    expect(url).toContain("sort=priority");
    expect(url).not.toContain("item=");
  });

  it("replaces to bare pathname when ?item is the only param", () => {
    mockSearchParams = new URLSearchParams("item=42");
    mockItem = makeItem();
    render(<RoadmapInitiativePane itemId={42} />);
    fireEvent.click(screen.getByTestId("sheet"));
    expect(mockReplace).toHaveBeenCalledWith("/build/products/7/roadmap", { scroll: false });
  });

  it("also strips ticket and opportunity params on close", () => {
    mockSearchParams = new URLSearchParams("item=42&ticket=10&ticketProject=3&opportunity=5");
    mockItem = makeItem();
    render(<RoadmapInitiativePane itemId={42} />);
    fireEvent.click(screen.getByTestId("sheet"));
    const url = mockReplace.mock.calls[0][0] as string;
    expect(url).not.toContain("ticket=");
    expect(url).not.toContain("opportunity=");
  });
});

describe("RoadmapInitiativePane — focus returns to trigger on close", () => {
  it("restores focus to the element that was active when the pane opened", async () => {
    mockItem = makeItem();
    const button = document.createElement("button");
    button.setAttribute("data-testid", "trigger");
    document.body.appendChild(button);
    button.focus();
    expect(document.activeElement).toBe(button);

    const { rerender } = render(<RoadmapInitiativePane itemId={null} />);
    act(() => { button.focus(); });
    rerender(<RoadmapInitiativePane itemId={42} />);
    fireEvent.click(screen.getByTestId("sheet"));

    await act(async () => { await new Promise((r) => setTimeout(r, 80)); });
    expect(document.activeElement).toBe(button);

    document.body.removeChild(button);
  });
});

describe("RoadmapInitiativePane — nested ticket pane", () => {
  it("renders TicketDetailPane when ?ticket and ?ticketProject params are present", () => {
    mockSearchParams = new URLSearchParams("item=42&ticket=99&ticketProject=10");
    mockItem = makeItem({ epicTicketId: 99, projectId: 10 });
    render(<RoadmapInitiativePane itemId={42} />);
    const pane = screen.getByTestId("ticket-detail-pane");
    expect(pane).toHaveAttribute("data-ticket-id", "99");
    expect(pane).toHaveAttribute("data-project-id", "10");
  });

  it("sets originHref to URL with ?item but without ?ticket params", () => {
    mockSearchParams = new URLSearchParams("item=42&ticket=99&ticketProject=10&view=board");
    mockItem = makeItem({ epicTicketId: 99, projectId: 10 });
    render(<RoadmapInitiativePane itemId={42} />);
    const origin = screen.getByTestId("ticket-detail-pane").getAttribute("data-origin") ?? "";
    expect(origin).toContain("item=42");
    expect(origin).toContain("view=board");
    expect(origin).not.toContain("ticket=");
  });

  it("does not render TicketDetailPane when ticket params are absent", () => {
    mockSearchParams = new URLSearchParams("item=42");
    mockItem = makeItem();
    render(<RoadmapInitiativePane itemId={42} />);
    expect(screen.queryByTestId("ticket-detail-pane")).not.toBeInTheDocument();
  });
});

describe("RoadmapInitiativePane — nested opportunity pane", () => {
  it("renders OpportunityPane when ?opportunity param is present and item has managedProductId", () => {
    mockSearchParams = new URLSearchParams("item=42&opportunity=5");
    mockItem = makeItem({ managedProductId: 7, opportunityId: 5 });
    render(<RoadmapInitiativePane itemId={42} />);
    const pane = screen.getByTestId("opportunity-pane");
    expect(pane).toHaveAttribute("data-product-id", "7");
    expect(pane).toHaveAttribute("data-opp-id", "5");
  });

  it("does not render OpportunityPane when opportunity param is absent", () => {
    mockSearchParams = new URLSearchParams("item=42");
    mockItem = makeItem({ managedProductId: 7 });
    render(<RoadmapInitiativePane itemId={42} />);
    expect(screen.queryByTestId("opportunity-pane")).not.toBeInTheDocument();
  });

  it("shows opportunity title as a button when item has a linked opportunity", () => {
    mockItem = makeItem({ opportunity: { id: 5, title: "Reduce churn", problem: null, hypothesis: null, affectedSegment: null, theme: null } });
    render(<RoadmapInitiativePane itemId={42} />);
    expect(screen.getByRole("button", { name: "Reduce churn" })).toBeInTheDocument();
  });
});
