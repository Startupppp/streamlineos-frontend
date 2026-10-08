import { render, screen } from "@testing-library/react";
import { ProjectsViewContent } from "./projects-view-content";
import type { ProjectListItem } from "@/types/projects/projects";

jest.mock("./project-card", () => ({
  ProjectCard: ({ project }: { project: ProjectListItem }) => (
    <article>{project.name}</article>
  ),
}));

jest.mock("./project-table", () => ({
  ProjectTable: () => null,
}));

const project: ProjectListItem = {
  id: 1,
  name: "Project Alpha",
  description: null,
  key: "PA",
  status: "ACTIVE",
  priority: null,
  health: "on_track",
  managedProductId: null,
  startDate: null,
  endDate: null,
  manager: null,
  progress: { total: 0, done: 0, percentage: 0 },
  members: [],
  teams: [],
};

describe("ProjectsViewContent grid layout", () => {
  it("keeps cards and the non-sticky pagination footer in one scrolling results area", () => {
    render(
      <ProjectsViewContent
        viewMode="grid"
        visibleProjects={[project]}
        allProjects={[project]}
        prefs={{
          showSummary: false,
          showStatus: true,
          showClosed: false,
          showPriority: true,
          showHealth: true,
          showLead: true,
          showMembers: false,
          showTeams: false,
          showTargetDate: true,
          showStartDate: false,
          showProgress: true,
          showIssueCount: true,
          groupBy: "none",
          orderBy: "name",
          orderDir: "asc",
        }}
        pageNumber={1}
        hasMore={false}
        hasPrevious={false}
        onNext={jest.fn()}
        onPrevious={jest.fn()}
        showGroupingSidebar={false}
        onGroupingSidebarChange={jest.fn()}
        activeGroup={null}
        onGroupSelect={jest.fn()}
        shouldReduceMotion
      />,
    );

    const grid = screen.getByRole("list", { name: "Projects grid" });
    expect(grid.parentElement).toHaveClass("overflow-y-auto", "overscroll-contain");
    expect(grid.parentElement).not.toHaveClass("pb-4");

    const pagination = screen.getByRole("navigation", { name: "Pagination" });
    expect(pagination).not.toHaveClass("sticky");
    expect(pagination).not.toHaveClass("bottom-0");
    expect(pagination.parentElement).toBe(grid.parentElement);
    expect(
      grid.compareDocumentPosition(pagination) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
