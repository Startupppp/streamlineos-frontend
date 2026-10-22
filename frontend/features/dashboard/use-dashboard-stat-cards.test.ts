import { renderHook } from "@testing-library/react";

import { executiveKpiStats, useDashboardStatCards } from "./use-dashboard-stat-cards";
import type { DashboardAccess } from "./use-dashboard-access";
import type { DashboardStats } from "@/types/dashboard";


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
    canViewPayrollSelf: false, canRunPayroll: false, canViewPayslips: false,
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

  it("places headcount and open roles after the home stats", () => {
    const cards = executiveKpiStats({
      included: true,
      headcount: 5,
      openRoles: 0,
    });
    expect(cards.map((card) => [card.label, card.value])).toEqual([
      ["Headcount", 5],
      ["Open Roles", 0],
    ]);
    expect(cards.some((card) => card.label === "Active Projects")).toBe(false);
  });
});
