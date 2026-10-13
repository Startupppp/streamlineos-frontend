import { render, screen, fireEvent } from "@testing-library/react";
import type { FeedbucketCustomerImpactRow } from "@/hooks/api/feedbucket/feedbucket-schema";
import { CustomerImpactPanel } from "./customer-impact-panel";

jest.mock("@/hooks/api/feedbucket/use-feedbucket-product-stats", () => ({
  useProductCustomerImpact: jest.fn(),
}));

const { useProductCustomerImpact } = jest.requireMock(
  "@/hooks/api/feedbucket/use-feedbucket-product-stats",
) as { useProductCustomerImpact: jest.Mock };

const MANAGED_PRODUCT_ID = 55;
const ROWS: FeedbucketCustomerImpactRow[] = [
  {
    crmOrganizationId: 42,
    customerName: "ACME Corp",
    submissionCount: 7,
    opportunityCount: 2,
    accountValue: "80000.00",
    segments: [],
    tier: null,
  },
  {
    crmOrganizationId: 99,
    customerName: null,
    submissionCount: 3,
    opportunityCount: 0,
    accountValue: null,
    segments: [],
    tier: null,
  },
];

const ALLOWED_ACCESS = { denied: false, allowed: true, pending: false, unavailable: false };
const DENIED_ACCESS = { denied: true, allowed: false, pending: false, unavailable: false };

describe("CustomerImpactPanel", () => {
  beforeEach(() => {
    useProductCustomerImpact.mockReturnValue({
      data: { rows: ROWS },
      isLoading: false,
      isError: false,
      error: null,
      access: ALLOWED_ACCESS,
      refetch: jest.fn(),
    });
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
    useProductCustomerImpact.mockReturnValue({
      data: { rows: [] },
      isLoading: false,
      isError: false,
      error: null,
      access: ALLOWED_ACCESS,
      refetch: jest.fn(),
    });
    const { container } = render(<CustomerImpactPanel managedProductId={MANAGED_PRODUCT_ID} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows skeleton rows while loading", () => {
    useProductCustomerImpact.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      access: ALLOWED_ACCESS,
      refetch: jest.fn(),
    });
    const { container } = render(<CustomerImpactPanel managedProductId={MANAGED_PRODUCT_ID} />);
    expect(container.querySelectorAll(".animate-pulse, [data-slot='skeleton']").length).toBeGreaterThan(0);
  });

  it("shows an error message and retry button on error", () => {
    const refetch = jest.fn();
    useProductCustomerImpact.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Network failure"),
      access: ALLOWED_ACCESS,
      refetch,
    });
    render(<CustomerImpactPanel managedProductId={MANAGED_PRODUCT_ID} />);
    expect(screen.getByText(/Network failure/i)).toBeInTheDocument();
    const retryBtn = screen.getByTestId("customer-impact-retry");
    expect(retryBtn).toBeInTheDocument();
    fireEvent.click(retryBtn);
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("shows the denial notice when access is denied", () => {
    useProductCustomerImpact.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      access: DENIED_ACCESS,
      refetch: jest.fn(),
    });
    render(<CustomerImpactPanel managedProductId={MANAGED_PRODUCT_ID} />);
    expect(screen.getByTestId("customer-impact-denied")).toBeInTheDocument();
    expect(screen.getByText(/CRM customer fields are hidden/i)).toBeInTheDocument();
  });

  it("renders tier when present on a row", () => {
    const rowWithTier = { ...ROWS[0]!, tier: "Gold" };
    useProductCustomerImpact.mockReturnValue({
      data: { rows: [rowWithTier, ROWS[1]!] },
      isLoading: false,
      isError: false,
      error: null,
      access: ALLOWED_ACCESS,
      refetch: jest.fn(),
    });
    render(<CustomerImpactPanel managedProductId={MANAGED_PRODUCT_ID} />);
    expect(screen.getByTestId(`tier-${ROWS[0]!.crmOrganizationId}`)).toHaveTextContent("Gold");
  });

  it("renders segments when present on a row", () => {
    const rowWithSegments = { ...ROWS[0]!, segments: ["enterprise", "financial"] };
    useProductCustomerImpact.mockReturnValue({
      data: { rows: [rowWithSegments, ROWS[1]!] },
      isLoading: false,
      isError: false,
      error: null,
      access: ALLOWED_ACCESS,
      refetch: jest.fn(),
    });
    render(<CustomerImpactPanel managedProductId={MANAGED_PRODUCT_ID} />);
    expect(screen.getByTestId(`segments-${ROWS[0]!.crmOrganizationId}`)).toHaveTextContent("enterprise, financial");
  });
});
