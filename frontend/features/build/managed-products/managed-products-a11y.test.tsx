import "./product-scope-pages.test-harness";
import { render, screen } from "./product-scope-pages.test-harness";
import { render as plainRender, fireEvent } from "@testing-library/react";
import { ManagedProductsPage } from "./managed-products-page";
import { ProductGoalsPage } from "./product-goals-page";
import { ProductRowActions } from "./managed-product-table-columns";
import {
  EMPTY_MANAGED_PRODUCTS_RESULT,
  EMPTY_GOALS_PAGE_RESULT,
  useGoalsPage,
  useManagedProducts,
  usePageState,
} from "./product-scope-pages.test-harness";
import type { ManagedProduct } from "@/types/projects";

const STUB_PRODUCT: ManagedProduct = {
  id: 1,
  orgId: "org-1",
  name: "Payments Platform",
  key: "PAY",
  status: "active",
  description: "Core payments",
  ownerId: null,
  ownerMembershipId: null,
  vision: null,
  missionStatement: null,
  targetCustomer: null,
  differentiators: null,
  currentPhase: null,
  targetLaunchDate: null,
  successMetrics: null,
  deletedAt: null,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-11-01T00:00:00Z",
};

jest.mock("framer-motion", () => ({
  ...jest.requireActual("framer-motion"),
  useReducedMotion: jest.fn(() => false),
}));

const { useReducedMotion } = jest.requireMock("framer-motion") as {
  useReducedMotion: jest.Mock;
};

describe("ProductRowActions context menu — C6 jsdom a11y (BSN-A11Y-MP-01)", () => {
  it("carries an aria-label naming the product so screen-reader users can identify the trigger", () => {
    plainRender(
      <ProductRowActions
        product={STUB_PRODUCT}
        onEdit={() => undefined}
        onDelete={() => undefined}
      />,
    );
    expect(
      screen.getByRole("button", { name: /actions for payments platform/i }),
    ).toBeInTheDocument();
  });

  it("trigger carries aria-haspopup=menu so assistive technology announces it as a menu opener (BSN-A11Y-MP-02)", () => {
    plainRender(
      <ProductRowActions
        product={STUB_PRODUCT}
        onEdit={() => undefined}
        onDelete={() => undefined}
      />,
    );
    const trigger = screen.getByRole("button", { name: /actions for payments platform/i });
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
  });

  it("trigger reports aria-expanded=false when closed so screen-reader state matches visual state (BSN-A11Y-MP-03)", () => {
    plainRender(
      <ProductRowActions
        product={STUB_PRODUCT}
        onEdit={() => undefined}
        onDelete={() => undefined}
      />,
    );
    const trigger = screen.getByRole("button", { name: /actions for payments platform/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});

describe("Managed Products list — C6 jsdom page-level a11y (BSN-A11Y-MP-04)", () => {
  beforeEach(() => {
    useManagedProducts.mockReturnValue(EMPTY_MANAGED_PRODUCTS_RESULT);
  });

  it("access-denied state does not look like empty data so screen readers do not report false emptiness", () => {
    usePageState.mockReturnValue({ kind: "denied", permission: "build:managed-products:view" });
    render(<ManagedProductsPage />);
    const denied = screen.getByTestId("no-permission");
    expect(denied).toBeInTheDocument();
    expect(denied).toHaveAttribute("data-permission", "build:managed-products:view");
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("error state is distinct from denied so a 500 does not look like an access problem (BSN-A11Y-MP-05)", () => {
    usePageState.mockReturnValue({ kind: "error", error: new Error("failed") });
    render(<ManagedProductsPage />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
    expect(screen.queryByTestId("no-permission")).not.toBeInTheDocument();
  });
});

describe("Product Goals page — C6 jsdom a11y reduced-motion (BSN-A11Y-GOALS-01)", () => {
  beforeEach(() => {
    useGoalsPage.mockReturnValue({
      ...EMPTY_GOALS_PAGE_RESULT,
      data: {
        items: [
          {
            id: 1,
            title: "Increase revenue 20%",
            status: "on_track",
            level: "company",
            progress: 45,
            keyResultCount: 3,
            owner: null,
          },
        ],
        page: 1,
        pageSize: 20,
        total: 1,
      },
    });
  });

  it("renders goal card content without error under default motion preferences", () => {
    useReducedMotion.mockReturnValue(false);
    render(<ProductGoalsPage managedProductId={7} />);
    expect(screen.getByText("Increase revenue 20%")).toBeInTheDocument();
  });

  it("renders goal card content without error when prefers-reduced-motion is set (BSN-A11Y-GOALS-02)", () => {
    useReducedMotion.mockReturnValue(true);
    render(<ProductGoalsPage managedProductId={7} />);
    expect(screen.getByText("Increase revenue 20%")).toBeInTheDocument();
  });

  it("goal progress bar carries an accessible label naming the goal so screen-reader users can track it (BSN-A11Y-GOALS-03)", () => {
    useReducedMotion.mockReturnValue(false);
    render(<ProductGoalsPage managedProductId={7} />);
    const progress = screen.getByRole("progressbar", {
      name: /increase revenue 20% progress/i,
    });
    expect(progress).toBeInTheDocument();
  });

  it("access-denied state is distinct from empty-goals so screen readers do not report false emptiness (BSN-A11Y-GOALS-04)", () => {
    usePageState.mockReturnValue({ kind: "denied", permission: "build:goals:view" });
    render(<ProductGoalsPage managedProductId={7} />);
    expect(screen.getByTestId("no-permission")).toHaveAttribute(
      "data-permission",
      "build:goals:view",
    );
    expect(screen.queryByText(/no goals yet/i)).not.toBeInTheDocument();
  });
});
