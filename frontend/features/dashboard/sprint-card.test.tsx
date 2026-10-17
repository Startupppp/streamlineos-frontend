import { render, screen } from "@testing-library/react";
import { SprintCard } from "./sprint-card";

describe("SprintCard", () => {
  it("opens the active iteration as an Issues filter", () => {
    render(
      <SprintCard
        summary={{
          id: 17,
          projectId: 42,
          name: "September",
          projectName: "Website",
          progress: 50,
          daysRemaining: 4,
          completedPoints: 8,
          totalPoints: 16,
          doneTickets: 4,
          inProgressTickets: 3,
          todoTickets: 2,
        }}
        isLoading={false}
      />,
    );

    expect(screen.getByRole("link", { name: "View active sprint issues" })).toHaveAttribute(
      "href",
      "/build/42/issues?cycle=17",
    );
  });
});
