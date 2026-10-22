import { render, screen } from "@testing-library/react";
import { ProductDiscoverySection } from "./product-discovery-section";

let mockParams = new URLSearchParams();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  useSearchParams: () => mockParams,
}));

const emptyQuery = { data: undefined, isLoading: false, isError: false, error: null, refetch: jest.fn() };
jest.mock("@/hooks/api/build/product-discovery", () => ({
  useOpportunities: () => emptyQuery,
  useEvidenceThemes: () => emptyQuery,
  useOpportunitiesCompare: () => emptyQuery,
  useOutcomeReviews: () => emptyQuery,
}));
jest.mock("@/hooks/api/build/outcome-review-mutations", () => ({
  useCreateOutcomeReview: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateOutcomeReview: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteOutcomeReview: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock("./use-opportunity-discovery-filters", () => ({
  useOpportunityDiscoveryFilters: () => ({ oppQueryParams: {}, themeParams: {} }),
}));
jest.mock("./evidence-themes-section", () => ({ EvidenceThemesSection: () => null }));
jest.mock("./opportunities-table", () => ({ OpportunitiesTable: () => null }));
jest.mock("./opportunities-filter-bar", () => ({ OpportunitiesFilterBar: () => null }));
jest.mock("./outcome-reviews-section", () => ({ OutcomeReviewsSection: () => null }));
jest.mock("./opportunity-create-sheet", () => ({ OpportunityCreateButton: () => null }));
jest.mock("./compare-drawer", () => ({ CompareDrawer: () => null, COMPARE_MAX: 5 }));
jest.mock("./opportunity-pane", () => ({
  OpportunityPane: ({ opportunityId }: { opportunityId: number | null }) =>
    opportunityId === null ? null : <div data-testid="pane">{opportunityId}</div>,
}));

it("opens the opportunity pane when ?opportunity= arrives after the section mounted", () => {
  mockParams = new URLSearchParams("tab=discovery");
  const { rerender } = render(<ProductDiscoverySection managedProductId={7} />);
  expect(screen.queryByTestId("pane")).toBeNull();

  mockParams = new URLSearchParams("tab=discovery&opportunity=42");
  rerender(<ProductDiscoverySection managedProductId={7} />);
  expect(screen.getByTestId("pane")).toHaveTextContent("42");

  mockParams = new URLSearchParams("tab=discovery&opportunity=nope");
  rerender(<ProductDiscoverySection managedProductId={7} />);
  expect(screen.queryByTestId("pane")).toBeNull();
});
