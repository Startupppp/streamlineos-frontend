import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProductSettingsProjectsSection } from "./product-settings-projects-section";

jest.mock("@/hooks/api/build/managed-product-projects", () => ({
  useManagedProductProjects: jest.fn(),
}));

jest.mock("@/hooks/api/build/use-link-project-managed-product", () => ({
  useUnlinkProjectPair: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useSetPrimaryProject: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const { useManagedProductProjects } = jest.requireMock(
  "@/hooks/api/build/managed-product-projects",
) as { useManagedProductProjects: jest.Mock };

const MANAGED_PRODUCT_ID = 1;

const BASE_ROW = {
  id: 10,
  name: "Alpha",
  key: "AL",
  status: "ACTIVE",
  isPrimary: false,
  health: null,
  ownerId: null,
  ownerMembershipId: null,
  managerMembershipId: null,
  startDate: null,
  endDate: null,
  nextMilestone: null,
  nextRelease: null,
  linkedGoals: [],
  contribution: { totalTickets: 0, doneTickets: 0, percent: null },
  linkedRoadmapItemCount: 0,
  revision: 1,
  sourceFreshness: "",
  allowedActions: ["setPrimary", "unlink"],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const PAGE2_ROW = { ...BASE_ROW, id: 20, name: "Beta", key: "BT" };

const EMPTY_PAGE = {
  data: [],
  pagination: { limit: 20, hasMore: false, nextCursor: null },
};

const PAGE1 = {
  data: [BASE_ROW],
  pagination: { limit: 20, hasMore: true, nextCursor: "cursor-1" },
};

const PAGE2 = {
  data: [PAGE2_ROW],
  pagination: { limit: 20, hasMore: false, nextCursor: null },
};

function makeQueryResult(overrides: Record<string, unknown> = {}) {
  return {
    data: EMPTY_PAGE,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    ...overrides,
  };
}

describe("ProductSettingsProjectsSection", () => {
  beforeEach(() => {
    useManagedProductProjects.mockClear();
  });

  it("renders the section heading", () => {
    useManagedProductProjects.mockReturnValue(makeQueryResult());

    render(<ProductSettingsProjectsSection managedProductId={MANAGED_PRODUCT_ID} />);

    expect(screen.getByRole("heading", { name: "Linked projects" })).toBeInTheDocument();
  });

  it("shows skeletons while loading", () => {
    useManagedProductProjects.mockReturnValue(
      makeQueryResult({ data: undefined, isLoading: true }),
    );

    render(<ProductSettingsProjectsSection managedProductId={MANAGED_PRODUCT_ID} />);

    expect(screen.queryByText(/No projects linked/)).not.toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("shows empty state when no projects are linked", () => {
    useManagedProductProjects.mockReturnValue(makeQueryResult());

    render(<ProductSettingsProjectsSection managedProductId={MANAGED_PRODUCT_ID} />);

    expect(screen.getByText(/No projects linked to this product/)).toBeInTheDocument();
  });

  it("shows the error state when the fetch fails", () => {
    useManagedProductProjects.mockReturnValue(
      makeQueryResult({ data: undefined, isError: true, error: new Error("Network error") }),
    );

    render(<ProductSettingsProjectsSection managedProductId={MANAGED_PRODUCT_ID} />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Could not load linked projects")).toBeInTheDocument();
  });

  it("does not render the empty state when there is a fetch error", () => {
    useManagedProductProjects.mockReturnValue(
      makeQueryResult({ data: undefined, isError: true, error: new Error("500") }),
    );

    render(<ProductSettingsProjectsSection managedProductId={MANAGED_PRODUCT_ID} />);

    expect(screen.queryByText(/No projects linked/)).not.toBeInTheDocument();
  });

  it("calls refetch when the retry button is clicked", () => {
    const refetch = jest.fn();
    useManagedProductProjects.mockReturnValue(
      makeQueryResult({ data: undefined, isError: true, error: new Error("fail"), refetch }),
    );

    render(<ProductSettingsProjectsSection managedProductId={MANAGED_PRODUCT_ID} />);

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it("lists projects from the first page", () => {
    useManagedProductProjects.mockReturnValue(makeQueryResult({ data: PAGE1 }));

    render(<ProductSettingsProjectsSection managedProductId={MANAGED_PRODUCT_ID} />);

    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it("shows Unlink button when row.allowedActions includes unlink", () => {
    useManagedProductProjects.mockReturnValue(makeQueryResult({ data: PAGE1 }));

    render(<ProductSettingsProjectsSection managedProductId={MANAGED_PRODUCT_ID} />);

    expect(screen.getByRole("button", { name: /Unlink Alpha/ })).toBeInTheDocument();
  });

  it("hides Unlink button when allowedActions is empty", () => {
    useManagedProductProjects.mockReturnValue(
      makeQueryResult({
        data: {
          data: [{ ...BASE_ROW, allowedActions: [] }],
          pagination: { limit: 20, hasMore: false, nextCursor: null },
        },
      }),
    );

    render(<ProductSettingsProjectsSection managedProductId={MANAGED_PRODUCT_ID} />);

    expect(screen.queryByRole("button", { name: /Unlink/ })).not.toBeInTheDocument();
  });

  it("hides Set primary button when allowedActions excludes setPrimary", () => {
    useManagedProductProjects.mockReturnValue(
      makeQueryResult({
        data: {
          data: [{ ...BASE_ROW, allowedActions: ["unlink"] }],
          pagination: { limit: 20, hasMore: false, nextCursor: null },
        },
      }),
    );

    render(<ProductSettingsProjectsSection managedProductId={MANAGED_PRODUCT_ID} />);

    expect(screen.queryByRole("button", { name: /Set.*primary/i })).not.toBeInTheDocument();
  });

  it("enables Next page button when hasMore is true", () => {
    useManagedProductProjects.mockReturnValue(makeQueryResult({ data: PAGE1 }));

    render(<ProductSettingsProjectsSection managedProductId={MANAGED_PRODUCT_ID} />);

    expect(screen.getByRole("button", { name: "Next page" })).not.toBeDisabled();
  });

  it("passes the nextCursor to the hook when Next page is clicked", () => {
    useManagedProductProjects
      .mockReturnValueOnce(makeQueryResult({ data: PAGE1 }))
      .mockReturnValue(makeQueryResult({ data: PAGE2 }));

    render(<ProductSettingsProjectsSection managedProductId={MANAGED_PRODUCT_ID} />);

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));

    expect(useManagedProductProjects).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: "cursor-1" }),
    );
  });

  it("shows the second page row after advancing", () => {
    useManagedProductProjects
      .mockReturnValueOnce(makeQueryResult({ data: PAGE1 }))
      .mockReturnValue(makeQueryResult({ data: PAGE2 }));

    render(<ProductSettingsProjectsSection managedProductId={MANAGED_PRODUCT_ID} />);

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));

    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("resets to page 1 when Previous page is clicked", () => {
    useManagedProductProjects
      .mockReturnValueOnce(makeQueryResult({ data: PAGE1 }))
      .mockReturnValue(makeQueryResult({ data: PAGE2 }));

    render(<ProductSettingsProjectsSection managedProductId={MANAGED_PRODUCT_ID} />);

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));

    expect(useManagedProductProjects).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: undefined }),
    );
  });

  it("Previous page button is disabled on page 1", () => {
    useManagedProductProjects.mockReturnValue(makeQueryResult({ data: PAGE1 }));

    render(<ProductSettingsProjectsSection managedProductId={MANAGED_PRODUCT_ID} />);

    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
  });
});
