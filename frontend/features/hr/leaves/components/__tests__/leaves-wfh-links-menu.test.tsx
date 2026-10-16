import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { LeavesWfhActions } from "../leaves-wfh-toolbar";

const granted = new Set<string>();

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => granted.has(key),
}));

jest.mock("@/lib/i18n/i18n", () => ({ useT: () => (key: string) => key }));

jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

function renderActions() {
  return render(
    <LeavesWfhActions
      canRequestLeave
      canRequestWfh={false}
      onRequestLeave={jest.fn()}
      onRequestWfh={jest.fn()}
    />,
  );
}

beforeEach(() => granted.clear());

describe("Leaves page links (QA 2026-10-14: policies, holidays and analytics were undiscoverable)", () => {
  it("links HR to leave setup, policies, holidays and analytics", () => {
    ["hr:leaves:manage", "hr:policies:view", "self:attendance", "hr:leaves:view"].forEach((k) => granted.add(k));
    renderActions();

    expect(screen.getByRole("link", { name: "Leave types & policies" })).toHaveAttribute("href", "/hr/leave-policies");
    expect(screen.getByRole("link", { name: "HR policies" })).toHaveAttribute("href", "/hr/settings/policies");
    expect(screen.getByRole("link", { name: "Holiday calendar" })).toHaveAttribute("href", "/hr/holidays");
    expect(screen.getByRole("link", { name: "Leave analytics" })).toHaveAttribute("href", "/hr/leaves/analytics");
  });

  it("offers an employee only the pages their role can open", () => {
    granted.add("self:attendance");
    renderActions();

    expect(screen.getByRole("link", { name: "Holiday calendar" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Leave analytics" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Leave types & policies" })).toBeNull();
  });

  it("renders no menu at all when no link is permitted", () => {
    renderActions();
    expect(screen.queryByRole("button", { name: "Leave settings and reports" })).toBeNull();
  });
});
