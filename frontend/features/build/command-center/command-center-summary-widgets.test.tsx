import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { OverviewWidget } from "./command-center-summary-widgets";

jest.mock("@/components/ui/stat-card", () => ({
  StatCardGrid: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  StatCard: ({ label, value }: { label: string; value: string | number }) => (
    <div>{label} {value}</div>
  ),
}));

describe("OverviewWidget", () => {
  it("shows project, issue, and overdue counts without linking away", () => {
    render(<OverviewWidget activeProjects={3} openIssues={12} overdueIssues={4} />);
    expect(screen.getByText("Projects 3")).toBeInTheDocument();
    expect(screen.getByText("Open issues 12")).toBeInTheDocument();
    expect(screen.getByText("Overdue 4")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
