import { render, screen } from "@testing-library/react";
import { TeamRosterSection } from "./team-roster-section";

const mockRoster = {
  teams: [
    { id: 1, name: "Platform", key: "PLAT" },
    { id: 2, name: "Growth", key: "GROW" },
  ],
  members: [
    {
      id: "user-1",
      name: "Alice",
      firstName: null,
      lastName: null,
      email: "alice@example.com",
      image: null,
    },
    {
      id: "user-2",
      name: "Bob",
      firstName: null,
      lastName: null,
      email: "bob@example.com",
      image: null,
    },
  ],
};

jest.mock("@/hooks/api/build/roster", () => ({
  useProjectRoster: () => ({
    data: mockRoster,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

describe("TeamRosterSection search", () => {
  it("filters teams by normalized name or key", () => {
    render(<TeamRosterSection projectId={1} search="  plat  " />);
    expect(screen.getByText("Platform")).toBeInTheDocument();
    expect(screen.queryByText("Growth")).not.toBeInTheDocument();
  });

  it("filters effective members by normalized name or email", () => {
    render(<TeamRosterSection projectId={1} search="BOB@EXAMPLE.COM" />);
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
    expect(screen.getByText("Effective members (1)")).toBeInTheDocument();
  });

  it("shows explicit filtered-empty feedback for both roster groups", () => {
    render(<TeamRosterSection projectId={1} search="no-match" />);
    expect(screen.getByText("No teams match your search.")).toBeInTheDocument();
    expect(screen.getByText("No effective members match your search.")).toBeInTheDocument();
    expect(screen.getByText("Effective members (0)")).toBeInTheDocument();
  });
});
