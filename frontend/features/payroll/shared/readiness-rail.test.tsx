import { render, screen } from "@testing-library/react";
import { ReadinessRail } from "./readiness-rail";

describe("PAY-B-018 the readiness rail counts blockers, not list items", () => {
  it("shows the server's open-blocker count when one summary item stands for several blockers", () => {
    render(
      <ReadinessRail
        canPay={false}
        blockers={[{ id: "exc", label: "3 open blockers to resolve" }]}
        blockerCount={3}
      />,
    );

    expect(screen.getByText(/blockers · 3/i)).toBeInTheDocument();
  });

  it("falls back to the number of items when no count is given", () => {
    render(<ReadinessRail canPay={false} blockers={[{ id: "status", label: "Run status is DRAFT" }]} />);

    expect(screen.getByText(/blockers · 1/i)).toBeInTheDocument();
  });
});
