import { render, screen } from "@testing-library/react";
import type { HTMLAttributes, PropsWithChildren } from "react";
import { QuickActions } from "./quick-actions";

jest.mock("next/link", () => {
  return function Link({
    children,
    href,
    ...props
  }: React.PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement>>) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

jest.mock("framer-motion", () => {
  function MotionDiv({
    children,
    variants: _variants,
    ...props
  }: PropsWithChildren<HTMLAttributes<HTMLDivElement> & { variants?: unknown }>) {
    return <div {...props}>{children}</div>;
  }

  return { motion: { div: MotionDiv } };
});

jest.mock("@/features/dashboard/use-dashboard-access", () => ({
  useDashboardAccess: () => ({
    projectsEnabled: true,
    canViewTickets: true,
    hrEnabled: true,
    canCreateEmployees: true,
    crmEnabled: true,
    canViewCrmLeads: true,
    canViewCrmReports: true,
    canViewAttendance: true,
    canViewEmployees: true,
  }),
}));

describe("QuickActions", () => {
  it("uses a touch-scrollable single row on mobile and a grid from tablet widths", () => {
    render(<QuickActions />);

    const projectsLink = screen.getByRole("link", { name: "Projects" });
    const actionItem = projectsLink.parentElement;
    const actionList = actionItem?.parentElement;

    expect(actionList).toHaveClass("flex", "overflow-x-auto", "snap-x", "sm:grid");
    expect(actionItem).toHaveClass("min-w-[min(100%,11rem)]", "sm:min-w-0");
  });
});
