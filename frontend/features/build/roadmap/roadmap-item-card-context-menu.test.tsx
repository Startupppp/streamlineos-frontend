import { render, screen, fireEvent } from "@testing-library/react";
import { RoadmapItemCard, type ScorableRoadmapItem } from "./roadmap-item-card";

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div>,
  },
  useReducedMotion: () => false,
}));

jest.mock("@animateicons/react/lucide", () => ({
  Trash2Icon: ({ ...props }: React.HTMLAttributes<HTMLElement>) => <span {...props} />,
}));

jest.mock("@/components/ui/animated-icon-button", () => ({
  AnimatedIconButton: ({ "aria-label": label, onClick }: { "aria-label": string; onClick: () => void }) => (
    <button type="button" aria-label={label} onClick={onClick} />
  ),
}));

jest.mock("./roadmap-priority-score", () => ({
  RoadmapPriorityScore: () => null,
}));

const ITEM = {
  id: 5,
  orgId: "org-1",
  projectId: null,
  title: "Bulk import",
  description: null,
  status: "planned",
  category: null,
  targetQuarter: "Q3 2026",
  isPublic: true,
  votes: 3,
  version: 2,
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
  outcome: null,
  ownerMembershipId: null,
  owner: null,
  allowedActions: ["edit", "delete", "move", "reorder"],
  sourceFreshness: null,
} as unknown as ScorableRoadmapItem;

const ITEM_NO_ACTIONS = { ...ITEM, allowedActions: [] } as unknown as ScorableRoadmapItem;

const ITEM_WITH_PROJECT = {
  ...ITEM,
  id: 7,
  title: "Analytics overhaul",
  projectId: 42,
} as unknown as ScorableRoadmapItem;

describe("RoadmapItemCard — canonical link targets", () => {
  it("keeps the item visually distinct from its muted roadmap column", () => {
    const { container } = render(<RoadmapItemCard item={ITEM} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(container.firstElementChild).toHaveClass("bg-card", "border-border", "dark:border-background", "shadow-sm");
    expect(screen.getByText("Bulk import")).toHaveClass("font-semibold");
    expect(screen.getByText("Planned")).toBeInTheDocument();
    expect(screen.getByText("Public")).toBeInTheDocument();
    expect(screen.getByText("3")).toHaveClass("font-mono", "tabular-nums");
  });

  it("renders a View project link whose href is the canonical project path, not an ID-less copy", () => {
    render(<RoadmapItemCard item={ITEM_WITH_PROJECT} onEdit={jest.fn()} onDelete={jest.fn()} />);
    const link = screen.getByRole("link", { name: "View project" });
    expect(link).toHaveAttribute("href", "/build/42");
  });

  it("renders no View project link when projectId is null", () => {
    render(<RoadmapItemCard item={ITEM} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.queryByRole("link", { name: "View project" })).not.toBeInTheDocument();
  });
});

describe("RoadmapItemCard — right click opens the same authorized actions as the visible row controls", () => {
  it("hides edit, delete, and context-menu actions when allowedActions is empty", () => {
    render(<RoadmapItemCard item={ITEM_NO_ACTIONS} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.queryByRole("button", { name: "Edit roadmap item" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete roadmap item" })).not.toBeInTheDocument();
    fireEvent.contextMenu(screen.getByText("Bulk import"));
    expect(screen.queryByRole("menuitem", { name: "Edit" })).not.toBeInTheDocument();
  });
  it("opens Edit and Delete on contextmenu, which the card offers nowhere else as a menu", () => {
    render(<RoadmapItemCard item={ITEM} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.queryByRole("menuitem", { name: "Edit" })).not.toBeInTheDocument();
    fireEvent.contextMenu(screen.getByText("Bulk import"));
    expect(screen.getByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Delete" })).toBeInTheDocument();
  });

  it("edits the same item the visible edit button edits", () => {
    const onEdit = jest.fn();
    render(<RoadmapItemCard item={ITEM} onEdit={onEdit} onDelete={jest.fn()} />);
    fireEvent.contextMenu(screen.getByText("Bulk import"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }));
    expect(onEdit).toHaveBeenCalledWith(ITEM);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("deletes the same item the visible delete button deletes", () => {
    const onDelete = jest.fn();
    render(<RoadmapItemCard item={ITEM} onEdit={jest.fn()} onDelete={onDelete} />);
    fireEvent.contextMenu(screen.getByText("Bulk import"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledWith(ITEM);
  });
});

describe("RoadmapItemCard — outcome delivery link (BT-1ea82c1d75fa)", () => {
  it("renders the outcome text when set so the measurable delivery target is visible on the card", () => {
    const ITEM_WITH_OUTCOME = {
      ...ITEM,
      outcome: "Reduce churn by 15% within 60 days of launch",
    } as unknown as ScorableRoadmapItem;
    render(<RoadmapItemCard item={ITEM_WITH_OUTCOME} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByTestId("roadmap-item-outcome")).toBeInTheDocument();
    expect(screen.getByTestId("roadmap-item-outcome")).toHaveTextContent(
      "Reduce churn by 15% within 60 days of launch",
    );
  });

  it("does not render the outcome block when outcome is null so the card stays compact for items with no stated outcome", () => {
    render(<RoadmapItemCard item={ITEM} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.queryByTestId("roadmap-item-outcome")).not.toBeInTheDocument();
  });
});

describe("RoadmapItemCard — epic link (BSN-RM-EPIC)", () => {
  it("shows an Epic link when both epicTicketId and projectId are set", () => {
    const item = { ...ITEM, projectId: 10, epicTicketId: 99 } as unknown as ScorableRoadmapItem;
    render(<RoadmapItemCard item={item} onEdit={jest.fn()} onDelete={jest.fn()} />);
    const link = screen.getByRole("link", { name: "View epic ticket" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/build/10/issues?ticket=99");
  });

  it("does not show the Epic link when epicTicketId is null", () => {
    const item = { ...ITEM, projectId: 10, epicTicketId: null } as unknown as ScorableRoadmapItem;
    render(<RoadmapItemCard item={item} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.queryByRole("link", { name: "View epic ticket" })).not.toBeInTheDocument();
  });

  it("does not show the Epic link when projectId is null even if epicTicketId is set", () => {
    const item = { ...ITEM, projectId: null, epicTicketId: 99 } as unknown as ScorableRoadmapItem;
    render(<RoadmapItemCard item={item} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.queryByRole("link", { name: "View epic ticket" })).not.toBeInTheDocument();
  });
});
