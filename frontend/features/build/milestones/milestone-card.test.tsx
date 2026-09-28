import { render, screen, fireEvent } from "@testing-library/react";
import { MilestoneCard } from "./milestone-card";
import type { ProjectMilestone } from "@/hooks/api/build/milestones";

jest.mock("@animateicons/react/lucide", () => ({
  EllipsisIcon: ({ ...props }: React.HTMLAttributes<HTMLElement>) => <span {...props} />,
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

const MILESTONE: ProjectMilestone = {
  id: 1,
  projectId: 7,
  orgId: "org-1",
  name: "Beta Launch",
  description: null,
  targetDate: "2026-12-01",
  status: "PENDING",
  createdBy: "user-1",
  ownerMembershipId: 4,
  owner: { membershipId: 4, firstName: "Dana", lastName: "Scully", image: null },
  linkedTicketCount: 4,
  completedTicketCount: 3,
  version: 2,
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
};

describe("MilestoneCard — progress is rendered from the linked work counts", () => {
  it("renders the completed share and percentage for a milestone with four linked and three completed tickets", () => {
    render(<MilestoneCard milestone={MILESTONE} onEdit={jest.fn()} />);
    expect(screen.getByText(/3\/4 done \(75%\)/)).toBeInTheDocument();
  });

  it("renders no progress for a milestone with no linked work, so an empty milestone is not shown as 0% complete", () => {
    render(
      <MilestoneCard
        milestone={{ ...MILESTONE, linkedTicketCount: 0, completedTicketCount: 0 }}
        onEdit={jest.fn()}
      />,
    );
    expect(screen.queryByText(/done \(/)).not.toBeInTheDocument();
  });

  it("renders the owner display name and never the membership id", () => {
    render(<MilestoneCard milestone={MILESTONE} onEdit={jest.fn()} />);
    expect(screen.getByText(/Dana Scully/)).toBeInTheDocument();
  });
});

describe("MilestoneCard — right click opens the same authorized actions as the row menu", () => {
  it("opens the actions menu on contextmenu with Edit and Delete when delete is authorized", () => {
    render(<MilestoneCard milestone={MILESTONE} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.queryByRole("menuitem", { name: "Edit" })).not.toBeInTheDocument();
    fireEvent.contextMenu(screen.getByText("Beta Launch"));
    expect(screen.getByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Delete" })).toBeInTheDocument();
  });

  it("omits Delete from the context menu when the viewer cannot delete, so the menu mirrors the authorized commands", () => {
    render(<MilestoneCard milestone={MILESTONE} onEdit={jest.fn()} />);
    fireEvent.contextMenu(screen.getByText("Beta Launch"));
    expect(screen.getByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("invokes the same edit callback from the context menu as the row menu does", () => {
    const onEdit = jest.fn();
    render(<MilestoneCard milestone={MILESTONE} onEdit={onEdit} />);
    fireEvent.contextMenu(screen.getByText("Beta Launch"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }));
    expect(onEdit).toHaveBeenCalledWith(MILESTONE);
  });
});
