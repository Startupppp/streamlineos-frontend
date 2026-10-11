import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { OverviewWidget } from "./command-center-summary-widgets";

jest.mock("@/components/ui/stat-card", () => ({
  StatCardGrid: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  StatCard: ({ label, href }: { label: string; href?: string }) => <a href={href}>{label}</a>,
}));

describe("OverviewWidget drill-downs", () => {
  it("opens the My Work Overdue tab from the Overdue card so the list matches the count", () => {
    render(<OverviewWidget activeProjects={3} openIssues={12} overdueIssues={4} />);
    expect(screen.getByRole("link", { name: "Overdue" })).toHaveAttribute("href", "/build/my-work?tab=overdue");
    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute("href", "/build/projects");
  });
});
