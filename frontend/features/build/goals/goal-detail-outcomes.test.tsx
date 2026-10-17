import { render, screen } from "@testing-library/react";
import { GoalOutcomesSection } from "./goal-detail-sections";


const SOURCE = {
  id: 5,
  title: "Activation review",
  metric: "Activation rate",
  unit: "%",
  baseline: "20.0000",
  target: "40.0000",
  actual: null,
  state: "scheduled",
  result: null,
  completedAt: null,
};

describe("GoalOutcomesSection", () => {
  it("lists outcome reviews with their figures and the roadmap items measuring the goal", () => {
    render(
      <GoalOutcomesSection
        measurementSources={[SOURCE]}
        roadmapItems={[{ id: 8, title: "Guided onboarding", horizon: "now", status: "in_progress" }]}
      />,
    );

    expect(screen.getByText("Activation review")).toBeInTheDocument();
    expect(screen.getByText("Activation rate · 20 % → 40 % → —")).toBeInTheDocument();
    expect(screen.getByText("scheduled")).toBeInTheDocument();
    expect(screen.getByText("Guided onboarding")).toBeInTheDocument();
    expect(screen.getByText("now · in progress")).toBeInTheDocument();
  });

  it("hides the outcome reviews block when only roadmap items measure the goal", () => {
    render(
      <GoalOutcomesSection
        measurementSources={[]}
        roadmapItems={[{ id: 8, title: "Guided onboarding", horizon: "next", status: "planned" }]}
      />,
    );

    expect(screen.getByText("Roadmap items")).toBeInTheDocument();
    expect(screen.queryByText("Outcome reviews")).not.toBeInTheDocument();
  });

  it("shows the empty state when nothing measures the goal", () => {
    render(<GoalOutcomesSection measurementSources={[]} roadmapItems={[]} />);

    expect(screen.getByText("No outcomes yet")).toBeInTheDocument();
    expect(screen.queryByText("Outcome reviews")).not.toBeInTheDocument();
  });
});
