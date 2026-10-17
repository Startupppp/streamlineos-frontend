import { render, screen } from "@testing-library/react";
import type { FeedbucketOpportunityImpactRow } from "@/hooks/api/feedbucket/feedbucket-schema";
import { OpportunityImpactTable } from "./opportunity-impact-table";

jest.mock("@/hooks/api/feedbucket/use-feedbucket-product-stats", () => ({
  useProductOpportunityImpact: jest.fn(),
}));

const { useProductOpportunityImpact } = jest.requireMock(
  "@/hooks/api/feedbucket/use-feedbucket-product-stats",
) as { useProductOpportunityImpact: jest.Mock };

const MANAGED_PRODUCT_ID = 5;
const ROWS: FeedbucketOpportunityImpactRow[] = [
  {
    opportunityId: 1,
    distinctCustomers: 3,
    segments: ["Enterprise", "SMB"],
    requestCount: 12,
    summedAccountValue: "150000",
  },
  {
    opportunityId: 2,
    distinctCustomers: 1,
    segments: [],
    requestCount: 4,
    summedAccountValue: null,
  },
];

describe("OpportunityImpactTable", () => {
  it("renders a row per opportunity with correct data", () => {
    useProductOpportunityImpact.mockReturnValue({ data: { rows: ROWS }, isLoading: false });

    render(<OpportunityImpactTable managedProductId={MANAGED_PRODUCT_ID} />);

    expect(screen.getByRole("link", { name: "#1" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "#2" })).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("150000")).toBeInTheDocument();
  });

  it("links each row to the insights opportunity pane", () => {
    useProductOpportunityImpact.mockReturnValue({ data: { rows: ROWS }, isLoading: false });

    render(<OpportunityImpactTable managedProductId={MANAGED_PRODUCT_ID} />);

    const link = screen.getByRole("link", { name: "#1" });
    expect(link).toHaveAttribute(
      "href",
      `/build/managed-products/${MANAGED_PRODUCT_ID}/insights?view=discovery&opportunity=1`,
    );
  });

  it("shows Restricted when summedAccountValue is null", () => {
    useProductOpportunityImpact.mockReturnValue({ data: { rows: ROWS }, isLoading: false });

    render(<OpportunityImpactTable managedProductId={MANAGED_PRODUCT_ID} />);

    expect(screen.getByText("Restricted")).toBeInTheDocument();
  });

  it("renders segments as comma-separated text", () => {
    useProductOpportunityImpact.mockReturnValue({ data: { rows: ROWS }, isLoading: false });

    render(<OpportunityImpactTable managedProductId={MANAGED_PRODUCT_ID} />);

    expect(screen.getByText("Enterprise, SMB")).toBeInTheDocument();
  });

  it("renders a loading skeleton while data is loading", () => {
    useProductOpportunityImpact.mockReturnValue({ data: undefined, isLoading: true });

    render(<OpportunityImpactTable managedProductId={MANAGED_PRODUCT_ID} />);

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders nothing when rows are empty", () => {
    useProductOpportunityImpact.mockReturnValue({ data: { rows: [] }, isLoading: false });

    const { container } = render(<OpportunityImpactTable managedProductId={MANAGED_PRODUCT_ID} />);

    expect(container.firstChild).toBeNull();
  });

  it("renders an error state with retry when the impact fetch fails so the user can recover without a page reload", () => {
    const refetch = jest.fn();
    useProductOpportunityImpact.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Network error"),
      refetch,
    });

    render(<OpportunityImpactTable managedProductId={MANAGED_PRODUCT_ID} />);

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });
});
