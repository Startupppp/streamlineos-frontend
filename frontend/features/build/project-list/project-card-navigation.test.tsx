import { fireEvent, render, screen } from "@testing-library/react";
import { ProjectCard } from "./project-card";
import type { ProjectListItem } from "@/types/projects/projects";

const mockPush = jest.fn();
const mockCan = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => mockCan(key),
}));

jest.mock("./project-card-dialogs", () => ({
  ProjectCardDialogs: () => null,
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

beforeEach(() => {
  jest.clearAllMocks();
  mockCan.mockReturnValue(false);
});

describe("ProjectCard navigation", () => {
  it("uses the compact project-card layout contract", () => {
    render(<ProjectCard project={project} />);

    expect(screen.getByRole("article")).toHaveAttribute(
      "data-slot",
      "project-card",
    );
    expect(screen.getByRole("article")).toHaveClass("p-3");
    expect(
      screen.getByTestId("project-card-footer"),
    ).toHaveClass("mt-2.5", "pt-2.5");
    expect(screen.getByText("No tickets yet")).toBeVisible();
  });

  it("exposes a native project URL for new-tab and copied-link navigation", () => {
    render(<ProjectCard project={project} />);

    expect(screen.getByRole("link", { name: "Open Client Launch" })).toHaveAttribute(
      "href",
      "/build/42",
    );
  });

  it("routes normal link activation without also firing the card's background handler", () => {
    render(<ProjectCard project={project} />);

    fireEvent.click(screen.getByRole("link", { name: "Open Client Launch" }));

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/build/42");
  });

  it("leaves modified link activation to the browser", () => {
    render(<ProjectCard project={project} />);

    fireEvent.click(screen.getByRole("link", { name: "Open Client Launch" }), {
      ctrlKey: true,
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("does not hijack modified clicks on card background", () => {
    render(<ProjectCard project={project} />);

    fireEvent.click(screen.getByRole("article"), { metaKey: true });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("retains normal background click navigation", () => {
    render(<ProjectCard project={project} />);

    fireEvent.click(screen.getByRole("article"));

    expect(mockPush).toHaveBeenCalledWith("/build/42");
  });

  it("does not navigate when the card action menu opens", () => {
    mockCan.mockImplementation((key: string) => key === "build:delete");
    render(<ProjectCard project={project} />);

    fireEvent.click(screen.getByRole("button", { name: "Actions for Client Launch" }));

    expect(mockPush).not.toHaveBeenCalled();
  });
});
