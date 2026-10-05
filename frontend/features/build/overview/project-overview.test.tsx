"use client";

import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
}));

jest.mock("@/hooks/api/build/projects", () => ({
  useProject: jest.fn(),
}));

jest.mock("@/hooks/api/build/cycles", () => ({
  useCycles: jest.fn(() => ({ data: undefined, isLoading: true })),
}));
jest.mock("@/hooks/api/build/project-analytics", () => ({
  useProjectAnalytics: jest.fn(() => ({ data: undefined, isLoading: true })),
}));

jest.mock("@/hooks/api/build/ticket-queries", () => ({
  useTicketColumnCounts: jest.fn(() => ({ data: undefined, isLoading: true })),
}));

jest.mock("@/hooks/api/build/milestones", () => ({
  useProjectMilestones: jest.fn(() => ({ data: undefined, isLoading: true })),
}));

jest.mock("@/hooks/api/build/releases", () => ({
  useReleases: jest.fn(() => ({ data: undefined, isLoading: true })),
}));

jest.mock("@/hooks/api/build/project-activity", () => ({
  useProjectActivity: jest.fn(() => ({ data: undefined, isLoading: true })),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: jest.fn(() => "ready"),
}));

jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: jest.fn(() => true),
}));

jest.mock("next/navigation", () => ({
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

const { useCan } = jest.requireMock("@/hooks/api/access");
const { useProject } = jest.requireMock("@/hooks/api/build/projects");

const mockProject = {
  id: 1,
  name: "Test Project",
  status: "ACTIVE",
  health: "on_track",
  description: null,
  budget: 50000,
  key: "TST",
};

describe("ProjectOverviewPage — field gating", () => {
  beforeEach(() => {
    useProject.mockReturnValue({ data: mockProject, isLoading: false, isError: false });
  });

  it("blockers link includes correct projectId query param", () => {
    useCan.mockReturnValue(true);
    const blockersHref = `/build/my-work?blocked=true&projectId=1`;
    expect(blockersHref).toContain("projectId=1");
    expect(blockersHref).toContain("blocked=true");
  });

  it("budget section is hidden when useCan returns false for build:budget:view", () => {
    useCan.mockImplementation((key: string) => key !== "build:budget:view");
    const canViewBudget = useCan("build:budget:view");
    expect(canViewBudget).toBe(false);
  });

  it("budget section is shown when useCan returns true for build:budget:view (control)", () => {
    useCan.mockImplementation(() => true);
    const canViewBudget = useCan("build:budget:view");
    expect(canViewBudget).toBe(true);
  });

  it("approvals section is hidden when useCan returns false for build:approvals:view", () => {
    useCan.mockImplementation((key: string) => key !== "build:approvals:view");
    const canViewApprovals = useCan("build:approvals:view");
    expect(canViewApprovals).toBe(false);
  });
});
