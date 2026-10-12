import { render, screen } from "@testing-library/react";
import { CustomerImpactPanel } from "./customer-impact-panel";

jest.mock("@/hooks/api/feedbucket/use-feedbucket-product-stats", () => ({
  useProductCustomerImpact: jest.fn(),
}));

const { useProductCustomerImpact } = jest.requireMock(
  "@/hooks/api/feedbucket/use-feedbucket-product-stats",
) as { useProductCustomerImpact: jest.Mock };

const MANAGED_PRODUCT_ID = 55;
const ROWS = [
  {
    crmOrganizationId: 42,
    customerName: "ACME Corp",
    submissionCount: 7,
    opportunityCount: 2,
    accountValue: "80000.00",
  },
  {
    crmOrganizationId: 99,
    customerName: null,
    submissionCount: 3,
    opportunityCount: 0,
    accountValue: null,
  },
];

describe("CustomerImpactPanel", () => {
  beforeEach(() => {
    useProductCustomerImpact.mockReturnValue({ data: { rows: ROWS }, isLoading: false });
  });

  it("renders a link with crmOrganizationId in the href for each row", () => {
    render(<CustomerImpactPanel managedProductId={MANAGED_PRODUCT_ID} />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute(
      "href",
      `/build/managed-products/${MANAGED_PRODUCT_ID}/feedback?crmOrganizationId=${ROWS[0]!.crmOrganizationId}`,
    );
    expect(links[1]).toHaveAttribute(
      "href",
      `/build/managed-products/${MANAGED_PRODUCT_ID}/feedback?crmOrganizationId=${ROWS[1]!.crmOrganizationId}`,
    );
  });

  it("shows customer names when present and a fallback when customerName is null", () => {
    render(<CustomerImpactPanel managedProductId={MANAGED_PRODUCT_ID} />);

    expect(screen.getByText("ACME Corp")).toBeInTheDocument();
    expect(screen.getByText("Unknown customer")).toBeInTheDocument();
  });

  it("shows submission counts for each row", () => {
    render(<CustomerImpactPanel managedProductId={MANAGED_PRODUCT_ID} />);

    expect(screen.getByLabelText("7 submissions")).toBeInTheDocument();
    expect(screen.getByLabelText("3 submissions")).toBeInTheDocument();
  });

  it("the crmOrganizationId query param is the key that use-product-feedback-filters reads", () => {
    render(<CustomerImpactPanel managedProductId={MANAGED_PRODUCT_ID} />);

    const firstLink = screen.getAllByRole("link")[0]!;
    const url = new URL(firstLink.getAttribute("href")!, "https://x");
    expect(url.searchParams.get("crmOrganizationId")).toBe(String(ROWS[0]!.crmOrganizationId));
  });

  it("returns null (renders nothing) when data has no rows", () => {
    useProductCustomerImpact.mockReturnValue({ data: { rows: [] }, isLoading: false });
    const { container } = render(<CustomerImpactPanel managedProductId={MANAGED_PRODUCT_ID} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows skeleton rows while loading", () => {
    useProductCustomerImpact.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = render(<CustomerImpactPanel managedProductId={MANAGED_PRODUCT_ID} />);
    expect(container.querySelectorAll(".animate-pulse, [data-slot='skeleton']").length).toBeGreaterThan(0);
  });
});
