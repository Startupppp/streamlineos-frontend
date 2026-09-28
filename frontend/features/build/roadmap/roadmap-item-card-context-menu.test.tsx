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
} as unknown as ScorableRoadmapItem;

describe("RoadmapItemCard — right click opens the same authorized actions as the visible row controls", () => {
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
