import React from "react";
import { render, screen } from "@testing-library/react";
import type { BuildListFiltersState } from "@/features/build/shared/use-build-list-filters";

jest.mock("@/hooks/api/build/teams", () => ({
  useProjectTeams: jest.fn(() => ({ data: undefined })),
}));

jest.mock("@/hooks/api/goals", () => ({
  useGoals: jest.fn(() => ({ data: undefined })),
}));

jest.mock("@/hooks/api/build/managed-products", () => ({
  useManagedProduct: jest.fn(() => ({ data: undefined })),
}));

jest.mock("@/features/build/shared/build-list-toolbar", () => ({
  BuildListToolbar: ({
    filters,
  }: {
    filters: Array<{ id: string; label: string; active: boolean; control: React.ReactNode }>;
  }) => (
    <div data-testid="build-list-toolbar">
      {filters.map((f) => (
        <div key={f.id} data-testid={`filter-${f.id}`} data-active={String(f.active)}>
          {f.control}
        </div>
      ))}
    </div>
  ),
}));

jest.mock("@/features/build/shared/build-filter-select", () => ({
  BuildFilterSelect: ({ label, value }: { label: string; value: string }) => (
    <div data-testid={`filter-select-${label.toLowerCase()}`}>{value}</div>
  ),
}));

import { RoadmapFiltersBar } from "./roadmap-filters-bar";
import { useProjectTeams } from "@/hooks/api/build/teams";
import { useGoals } from "@/hooks/api/goals";
import { useManagedProduct } from "@/hooks/api/build/managed-products";

const mockListFilters: BuildListFiltersState = {
  search: "",
  debouncedSearch: "",
  setSearch: jest.fn(),
  value: jest.fn(() => "all"),
  isActive: jest.fn(() => false),
  setValue: jest.fn(),
  setValues: jest.fn(),
  clearAll: jest.fn(),
  resetKey: "k1",
};

beforeEach(() => {
  jest.clearAllMocks();
  (mockListFilters.value as jest.Mock).mockReturnValue("all");
  (mockListFilters.isActive as jest.Mock).mockReturnValue(false);
});

describe("RoadmapFiltersBar — core filters always shown (BSN-RM-FILTBAR)", () => {
  it("renders the toolbar with horizon, status, confidence, sort filters", () => {
    render(
      <RoadmapFiltersBar managedProductId={7} listFilters={mockListFilters} searchInputRef={{ current: null }} />,
    );
    expect(screen.getByTestId("filter-horizon")).toBeInTheDocument();
    expect(screen.getByTestId("filter-status")).toBeInTheDocument();
    expect(screen.getByTestId("filter-confidenceMin")).toBeInTheDocument();
    expect(screen.getByTestId("filter-sort")).toBeInTheDocument();
    expect(screen.getByTestId("filter-targetFrom")).toBeInTheDocument();
    expect(screen.getByTestId("filter-targetTo")).toBeInTheDocument();
  });
});

describe("RoadmapFiltersBar — team filter from real options (BSN-RM-TEAM)", () => {
  it("shows the team filter when teams data is available", () => {
    (useProjectTeams as jest.Mock).mockReturnValue({
      data: {
        data: [
          { id: 1, name: "Alpha Team" },
          { id: 2, name: "Beta Team" },
        ],
        pagination: { hasMore: false, nextCursor: null, limit: 50 },
      },
    });
    render(
      <RoadmapFiltersBar managedProductId={7} listFilters={mockListFilters} searchInputRef={{ current: null }} />,
    );
    expect(screen.getByTestId("filter-teamId")).toBeInTheDocument();
  });

  it("does not show the team filter when no teams are available", () => {
    (useProjectTeams as jest.Mock).mockReturnValue({ data: { data: [], pagination: { hasMore: false, nextCursor: null, limit: 50 } } });
    render(
      <RoadmapFiltersBar managedProductId={7} listFilters={mockListFilters} searchInputRef={{ current: null }} />,
    );
    expect(screen.queryByTestId("filter-teamId")).not.toBeInTheDocument();
  });
});

describe("RoadmapFiltersBar — goal filter from product-scoped goals (BSN-RM-GOAL)", () => {
  it("shows the goal filter when goals are available for the product", () => {
    (useGoals as jest.Mock).mockReturnValue({
      data: [{ id: 10, title: "Grow ARR" }, { id: 11, title: "Reduce churn" }],
    });
    render(
      <RoadmapFiltersBar managedProductId={7} listFilters={mockListFilters} searchInputRef={{ current: null }} />,
    );
    expect(screen.getByTestId("filter-goalId")).toBeInTheDocument();
  });

  it("calls useGoals with the managedProductId so goals are scoped to the product", () => {
    render(
      <RoadmapFiltersBar managedProductId={42} listFilters={mockListFilters} searchInputRef={{ current: null }} />,
    );
    expect(useGoals).toHaveBeenCalledWith(expect.objectContaining({ managedProductId: 42 }));
  });

  it("does not show the goal filter when no goals exist for the product", () => {
    (useGoals as jest.Mock).mockReturnValue({ data: [] });
    render(
      <RoadmapFiltersBar managedProductId={7} listFilters={mockListFilters} searchInputRef={{ current: null }} />,
    );
    expect(screen.queryByTestId("filter-goalId")).not.toBeInTheDocument();
  });
});

describe("RoadmapFiltersBar — segment filter from managed product record (BSN-RM-SEG)", () => {
  it("shows the segment filter when the product has segments", () => {
    (useManagedProduct as jest.Mock).mockReturnValue({
      data: { segments: ["Enterprise", "SMB", "Consumer"] },
    });
    render(
      <RoadmapFiltersBar managedProductId={7} listFilters={mockListFilters} searchInputRef={{ current: null }} />,
    );
    expect(screen.getByTestId("filter-segment")).toBeInTheDocument();
  });

  it("calls useManagedProduct with the managedProductId so segments are product-scoped", () => {
    render(
      <RoadmapFiltersBar managedProductId={55} listFilters={mockListFilters} searchInputRef={{ current: null }} />,
    );
    expect(useManagedProduct).toHaveBeenCalledWith(55);
  });

  it("does not show the segment filter when the product has no segments", () => {
    (useManagedProduct as jest.Mock).mockReturnValue({ data: { segments: [] } });
    render(
      <RoadmapFiltersBar managedProductId={7} listFilters={mockListFilters} searchInputRef={{ current: null }} />,
    );
    expect(screen.queryByTestId("filter-segment")).not.toBeInTheDocument();
  });
});
