import React from "react";
import { render, screen } from "@testing-library/react";
import type { MemberCapacityData } from "@/features/build/views/workload-types";

const mockUseCan = jest.fn();
const mockUseWorkloadCapacity = jest.fn();
const mockUseProjectMembers = jest.fn();

jest.mock("@/hooks/api/access", () => ({
  useCan: (...args: unknown[]) => mockUseCan(...args),
}));

jest.mock("@/hooks/api/build/workload-capacity", () => ({
  useWorkloadCapacity: (...args: unknown[]) => mockUseWorkloadCapacity(...args),
}));

jest.mock("@/hooks/api/build/project-members", () => ({
  useProjectMembers: (...args: unknown[]) => mockUseProjectMembers(...args),
}));

jest.mock("@/lib/person-display", () => ({
  getUserDisplayName: (user: { name?: string | null; email?: string | null }) =>
    user?.name ?? user?.email ?? "",
}));

import { WorkloadSection } from "./workload-section";

function makeCapacity(overrides: Partial<MemberCapacityData> = {}): MemberCapacityData {
  return {
    teams: [],
    capacityHours: 40,
    leaveDays: 0,
    loggedHours: 0,
    estimateHours: 20,
    allocationPercent: 50,
    varianceHours: 20,
    isOverAllocated: false,
    isZeroCapacity: false,
    utilizationPercent: 50,
    ...overrides,
  };
}

function memberRow(id: string, name: string) {
  return {
    id,
    name,
    firstName: null as string | null,
    lastName: null as string | null,
    image: null as string | null,
    email: `${id}@example.com`,
    role: "MEMBER",
    joinedAt: new Date().toISOString(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCan.mockReturnValue(true);
  mockUseWorkloadCapacity.mockReturnValue(new Map<string, MemberCapacityData>());
  mockUseProjectMembers.mockReturnValue({ data: undefined });
});

describe("WorkloadSection — overload indicator", () => {
  it("shows the overloaded badge when a member has isOverAllocated=true", () => {
    const capacityMap = new Map<string, MemberCapacityData>([
      ["user-1", makeCapacity({ isOverAllocated: true, estimateHours: 50, capacityHours: 40 })],
    ]);
    mockUseWorkloadCapacity.mockReturnValue(capacityMap);
    mockUseProjectMembers.mockReturnValue({
      data: { data: [memberRow("user-1", "Alice")] },
    });

    render(<WorkloadSection projectId={1} />);

    expect(screen.getByText("Overloaded")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("does not show the overloaded badge when a member is within capacity", () => {
    const capacityMap = new Map<string, MemberCapacityData>([
      ["user-2", makeCapacity({ isOverAllocated: false, estimateHours: 30, capacityHours: 40 })],
    ]);
    mockUseWorkloadCapacity.mockReturnValue(capacityMap);
    mockUseProjectMembers.mockReturnValue({
      data: { data: [memberRow("user-2", "Bob")] },
    });

    render(<WorkloadSection projectId={1} />);

    expect(screen.queryByText("Overloaded")).not.toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("renders no member rows when members list is empty", () => {
    mockUseProjectMembers.mockReturnValue({ data: { data: [] } });
    render(<WorkloadSection projectId={1} />);
    expect(screen.getByText("No members found")).toBeInTheDocument();
  });
});

describe("WorkloadSection — access gate", () => {
  it("renders nothing when build:view is denied so no unauthorized fetch occurs", () => {
    mockUseCan.mockReturnValue(false);

    const { container } = render(<WorkloadSection projectId={1} />);

    expect(container.firstChild).toBeNull();
    expect(mockUseWorkloadCapacity).toHaveBeenCalledWith(
      1,
      expect.any(String),
      expect.any(String),
      undefined,
      expect.objectContaining({ enabled: false }),
    );
  });
});
