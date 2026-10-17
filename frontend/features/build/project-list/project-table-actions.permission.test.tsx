import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { ActionsCell } from "./project-table-actions";
import type { ProjectListItem } from "@/types/projects/projects";

const mockUseCan = jest.fn();

jest.mock("@/hooks/api/access", () => ({
  useCan: (permission: string) => mockUseCan(permission),
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: ReactNode; onClick?: (event: React.MouseEvent) => void }) => (
    <button type="button" onClick={onClick}>{children}</button>
  ),
  DropdownMenuSeparator: () => <hr />,
}));

const project: ProjectListItem = {
  id: 42,
  name: "Client Launch",
  description: null,
  key: "CL",
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

function renderActions(permissions: string[]) {
  mockUseCan.mockImplementation((permission: string) => permissions.includes(permission));
  return render(
    <ActionsCell
      project={project}
      onEdit={jest.fn()}
      onArchive={jest.fn()}
      onDelete={jest.fn()}
    />,
  );
}

describe("project table action permissions", () => {
  beforeEach(() => jest.clearAllMocks());

  it("does not treat build:manage as build:update", () => {
    const { container } = renderActions(["build:manage"]);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText("Edit project")).not.toBeInTheDocument();
  });

  it("shows only delete to a delete-only user", () => {
    renderActions(["build:delete"]);

    expect(screen.getByText("Delete project")).toBeInTheDocument();
    expect(screen.queryByText("Edit project")).not.toBeInTheDocument();
    expect(screen.queryByText("Archive project")).not.toBeInTheDocument();
  });

  it("shows edit and archive only with the exact update permission", () => {
    renderActions(["build:update"]);

    expect(screen.getByText("Edit project")).toBeInTheDocument();
    expect(screen.getByText("Archive project")).toBeInTheDocument();
    expect(screen.queryByText("Delete project")).not.toBeInTheDocument();
  });
});
