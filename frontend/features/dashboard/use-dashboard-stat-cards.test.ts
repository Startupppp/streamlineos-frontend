import { renderHook } from "@testing-library/react";

import { useDashboardStatCards } from "./use-dashboard-stat-cards";
import type { DashboardAccess } from "./use-dashboard-access";
import type { DashboardStats } from "@/types/dashboard";

/**
 * `/dashboard/stats` fans out over three independent sections and each one is
 * deadline-protected: `settleSection` returns the section's fallback — `null`
 * for all three counts — when its query REJECTS **or** when it merely exceeds
 * HOME_SECTION_DEADLINE_MS (2,500 ms). So `null` on the wire means "we could not
 * find out", and it is a different fact from `0`.
 *
 * `stats.totalEmployees ?? 0` erased that difference on the most prominent card
 * in the product: an org with 500 employees whose count query stalled rendered
 * "Total Employees 0". An operator reads a number as a number — the org looks
 * empty, or looks like every employee was deleted — and nothing on the screen
 * knew anything had failed, so there was no retry affordance either.
 *
 * The card list already knows the other reading of `null` ("you may not see
 * this"): it only pushes a card when the caller holds the permission, so inside
 * the branch the permission is held and `null` can only be a degraded section.
 */

function access(over: Partial<DashboardAccess> = {}): DashboardAccess {
  return {
    accessLoading: false,
    accessResolved: true,
    refetchAccess: jest.fn(),
    hrEnabled: true,
    crmEnabled: false,
    projectsEnabled: true,
    payrollEnabled: false,
    signEnabled: false,
    accountingEnabled: false,
    canViewEmployees: true,
    canCreateEmployees: false,
    canViewAttendance: true,
    canSelfAttendance: false,
    canViewLeaves: false,
    canApproveLeaves: false,
    canViewExecutive: false,
    canViewCrmLeads: false,
    canViewCrmReports: false,
    canViewTickets: true,
    canViewPayrollSelf: false,
    canViewPayrollAdmin: false,
    canViewOnboardingDocsSummary: false,
    canViewExpenses: false,
    canCreateExpenses: false,
    canApproveExpenses: false,
    canViewInterviews: false,
    canViewSignEnvelopes: false,
    ...over,
  };
}

function stats(over: Partial<DashboardStats> = {}): DashboardStats {
  return {
    orgName: "Acme",
    orgSlug: "acme",
    totalEmployees: 500,
    activeProjects: 12,
    presentToday: 480,
    ...over,
  };
}

function cardsFor(value: DashboardStats | undefined) {
  const { result } = renderHook(() => useDashboardStatCards(value, access(), 7));
  return new Map(result.current.map((card) => [card.id, card]));
}

describe("useDashboardStatCards", () => {
  it("renders real counts, including a genuine zero", () => {
    const cards = cardsFor(stats({ totalEmployees: 0 }));
    expect(cards.get("employees")?.value).toBe(0);
    expect(cards.get("employees")?.unavailable).toBeFalsy();
    expect(cards.get("projects")?.value).toBe(12);
    expect(cards.get("present")?.value).toBe(480);
  });

  it("does NOT render a degraded employee count as the number 0", () => {
    const cards = cardsFor(stats({ totalEmployees: null }));
    const employees = cards.get("employees");
    expect(employees).toBeDefined();
    expect(employees?.value).not.toBe(0);
    expect(employees?.value).not.toBe("0");
    expect(employees?.unavailable).toBe(true);
    expect(employees?.hint).toMatch(/couldn't load/i);
  });

  it("does NOT render a degraded attendance count as the number 0", () => {
    const cards = cardsFor(stats({ presentToday: null }));
    expect(cards.get("present")?.value).not.toBe(0);
    expect(cards.get("present")?.unavailable).toBe(true);
  });

  it("does NOT render a degraded project count as the number 0", () => {
    const cards = cardsFor(stats({ activeProjects: null }));
    expect(cards.get("projects")?.value).not.toBe(0);
    expect(cards.get("projects")?.unavailable).toBe(true);
  });

  it("leaves the separately-sourced open-task count alone", () => {
    const cards = cardsFor(stats({ totalEmployees: null }));
    // `openIssueCount` comes from /dashboard/my-issues, not from the fanout, so
    // it carries no degraded reading and stays a plain number.
    expect(cards.get("my-tasks")?.value).toBe(7);
    expect(cards.get("my-tasks")?.unavailable).toBeFalsy();
  });

  it("degrades every section independently when the whole fanout stalls", () => {
    const cards = cardsFor(
      stats({ totalEmployees: null, presentToday: null, activeProjects: null }),
    );
    expect(
      [...cards.values()].filter((card) => card.unavailable).map((card) => card.id),
    ).toEqual(["employees", "present", "projects"]);
  });

  it("renders nothing at all before the payload arrives", () => {
    expect(cardsFor(undefined).size).toBe(0);
  });
});
