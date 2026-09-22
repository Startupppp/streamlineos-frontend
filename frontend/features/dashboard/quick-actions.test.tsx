import { act, render, renderHook, screen } from "@testing-library/react";
import type { HTMLAttributes, PropsWithChildren } from "react";
import { QuickActions, useQuickActions } from "./quick-actions";

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

  return { motion: { div: MotionDiv }, useReducedMotion: () => false };
});

jest.mock("@/lib/org-scoped-storage", () => ({
  useOrgStorageScope: () => "test-scope",
  orgScopedStorageKey: (name: string, scope: string) => `${scope}::${name}`,
  UNSCOPED: "unscoped",
}));

const accessDefaults = {
  accessLoading: false,
  accessResolved: true,
  refetchAccess: jest.fn(),
  hrEnabled: true,
  crmEnabled: true,
  projectsEnabled: true,
  payrollEnabled: false,
  signEnabled: false,
  canViewEmployees: true,
  canCreateEmployees: true,
  canViewAttendance: true,
  canSelfAttendance: false,
  canViewLeaves: false,
  canApproveLeaves: false,
  canViewExecutive: false,
  canViewCrmLeads: true,
  canViewCrmReports: true,
  canViewTickets: true,
  canViewPayrollSelf: false,
  canViewSignEnvelopes: false,
};

let mockAccess = { ...accessDefaults };

jest.mock("@/features/dashboard/use-dashboard-access", () => ({
  useDashboardAccess: () => mockAccess,
}));

beforeEach(() => {
  mockAccess = { ...accessDefaults };
  window.localStorage.clear();
});

describe("QuickActions", () => {
  it("uses a touch-scrollable single row on mobile and a grid from tablet widths", () => {
    render(<QuickActions />);

    const projectsLink = screen.getByRole("link", { name: "Projects" });
    const actionItem = projectsLink.parentElement;
    const actionList = actionItem?.parentElement;

    expect(actionList).toHaveClass("flex", "overflow-x-auto", "snap-x", "sm:grid");
    expect(actionItem).toHaveClass("min-w-[min(100%,11rem)]", "sm:min-w-0");
  });

  it("shows a pin button on each action card", () => {
    render(<QuickActions />);
    const pinButtons = screen.getAllByRole("button", { name: /^Pin / });
    expect(pinButtons.length).toBeGreaterThan(0);
  });
});

describe("useQuickActions — default order for a fresh user", () => {
  it("returns actions in role-aware order with no pins or recents", () => {
    const { result } = renderHook(() => useQuickActions());
    const labels = result.current.actions.map((a) => a.label);
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.length).toBeLessThanOrEqual(5);
    expect(result.current.actions.every((a) => !a.isPinned)).toBe(true);
  });

  it("admin ordering ranks admin actions first — Add Employee scores above My Leads", () => {
    const { result } = renderHook(() => useQuickActions());
    const labels = result.current.actions.map((a) => a.label);
    expect(labels).toContain("Add Employee");
    expect(labels.indexOf("Add Employee")).toBeLessThan(3);
  });

  it("a member without hr:employees:create never sees Add Employee, while their own self-service action survives", () => {
    mockAccess = { ...accessDefaults, canCreateEmployees: false };
    const { result } = renderHook(() => useQuickActions());
    const labels = result.current.actions.map((a) => a.label);
    expect(labels).not.toContain("Add Employee");
    expect(labels).toContain("My Leads");
  });
});

describe("useQuickActions — recency reorders", () => {
  it("a recently used action moves ahead of a same-score action that has not been used", () => {
    const { result } = renderHook(() => useQuickActions());
    const labelsBefore = result.current.actions.map((a) => a.label);

    expect(labelsBefore.length).toBeGreaterThan(1);
    const lastLabel = labelsBefore[labelsBefore.length - 1];
    expect(lastLabel).toBeDefined();

    act(() => {
      result.current.recordRecent(lastLabel);
    });

    const labelsAfter = result.current.actions.map((a) => a.label);
    const newIdx = labelsAfter.indexOf(lastLabel);
    expect(newIdx).toBeLessThan(labelsBefore.indexOf(lastLabel));
  });
});

describe("useQuickActions — pinned actions survive the cap", () => {
  it("a pinned action that would be cut by the cap is always included", () => {
    mockAccess = {
      ...accessDefaults,
      projectsEnabled: true,
      hrEnabled: true,
      crmEnabled: true,
      canViewTickets: true,
      canCreateEmployees: true,
      canViewCrmLeads: true,
      canViewCrmReports: true,
      canViewAttendance: true,
      canViewEmployees: true,
    };

    const { result } = renderHook(() => useQuickActions());
    const allLabels = result.current.actions.map((a) => a.label);
    expect(allLabels.length).toBe(5);

    const labelThatWouldBecut = result.current.actions[result.current.actions.length - 1].label;

    act(() => {
      result.current.togglePin(labelThatWouldBecut);
    });

    const labelsAfter = result.current.actions.map((a) => a.label);
    expect(labelsAfter).toContain(labelThatWouldBecut);
    const pinnedAction = result.current.actions.find((a) => a.label === labelThatWouldBecut);
    expect(pinnedAction?.isPinned).toBe(true);
  });

  it("an action pinned by the user appears first regardless of base score", () => {
    const { result } = renderHook(() => useQuickActions());
    const lastLabel = result.current.actions[result.current.actions.length - 1].label;

    act(() => {
      result.current.togglePin(lastLabel);
    });

    expect(result.current.actions[0].label).toBe(lastLabel);
    expect(result.current.actions[0].isPinned).toBe(true);
  });

  it("togglePin unpins an already-pinned action", () => {
    const { result } = renderHook(() => useQuickActions());
    const label = result.current.actions[0].label;

    act(() => {
      result.current.togglePin(label);
    });
    expect(result.current.actions.find((a) => a.label === label)?.isPinned).toBe(true);

    act(() => {
      result.current.togglePin(label);
    });
    expect(result.current.actions.find((a) => a.label === label)?.isPinned).toBe(false);
  });
});
