import React from "react";
import { render, screen } from "@testing-library/react";
import {
  ProductGoalHealthCell,
  ProductMobileSignals,
} from "./managed-product-list-cells";
import type { ManagedProduct } from "@/types/projects";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

function makeProduct(overrides: Partial<ManagedProduct> = {}): ManagedProduct {
  return {
    id: 1,
    orgId: "org-1",
    name: "Test product",
    description: null,
    status: "active",
    lifecycle: "growth",
    ownerId: null,
    owner: null,
    teamId: null,
    segments: [],
    tags: [],
    successMetrics: [],
    version: 1,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    goalHealth: null,
    sourceFreshness: null,
    ...overrides,
  } as ManagedProduct;
}

describe("ProductGoalHealthCell", () => {
  it("renders null when goalHealth is null", () => {
    const { container } = render(
      <ProductGoalHealthCell product={makeProduct({ goalHealth: null })} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders null when goalHealth total is zero", () => {
    const { container } = render(
      <ProductGoalHealthCell
        product={makeProduct({
          goalHealth: { total: 0, onTrack: 0, atRisk: 0, offTrack: 0 },
        })}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows onTrack/total ratio in mono tabular format", () => {
    render(
      <ProductGoalHealthCell
        product={makeProduct({
          goalHealth: { total: 5, onTrack: 3, atRisk: 1, offTrack: 1 },
        })}
      />,
    );
    expect(screen.getByText("3/5")).toBeInTheDocument();
  });

  it("uses success colour class when all goals are on track", () => {
    const { container } = render(
      <ProductGoalHealthCell
        product={makeProduct({
          goalHealth: { total: 4, onTrack: 4, atRisk: 0, offTrack: 0 },
        })}
      />,
    );
    expect(container.firstChild).toHaveClass(
      "text-status-success-ink-strong",
    );
  });

  it("uses danger colour class when any goal is off track", () => {
    const { container } = render(
      <ProductGoalHealthCell
        product={makeProduct({
          goalHealth: { total: 4, onTrack: 2, atRisk: 0, offTrack: 2 },
        })}
      />,
    );
    expect(container.firstChild).toHaveClass(
      "text-status-danger-ink-strong",
    );
  });

  it("uses warning colour class when goals are at risk but none off track", () => {
    const { container } = render(
      <ProductGoalHealthCell
        product={makeProduct({
          goalHealth: { total: 4, onTrack: 2, atRisk: 2, offTrack: 0 },
        })}
      />,
    );
    expect(container.firstChild).toHaveClass(
      "text-status-warning-ink-strong",
    );
  });

  it("exposes a title with per-bucket counts for screen readers and tooltips", () => {
    render(
      <ProductGoalHealthCell
        product={makeProduct({
          goalHealth: { total: 5, onTrack: 3, atRisk: 1, offTrack: 1 },
        })}
      />,
    );
    expect(screen.getByTitle("Goals: 3 on track, 1 at risk, 1 off track")).toBeInTheDocument();
  });
});

describe("ProductMobileSignals — sourceFreshness", () => {
  it("shows sourceFreshness as relative time when present", () => {
    render(
      <ProductMobileSignals
        product={makeProduct({
          sourceFreshness: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })}
      />,
    );
    expect(
      screen.getByTitle("Last feedback received"),
    ).toBeInTheDocument();
  });

  it("omits the freshness element when sourceFreshness is null", () => {
    render(
      <ProductMobileSignals
        product={makeProduct({
          sourceFreshness: null,
          updatedAt: new Date().toISOString(),
        })}
      />,
    );
    expect(
      screen.queryByTitle("Last feedback received"),
    ).not.toBeInTheDocument();
  });

  it("renders goal health inside mobile signals when goals exist", () => {
    render(
      <ProductMobileSignals
        product={makeProduct({
          goalHealth: { total: 3, onTrack: 3, atRisk: 0, offTrack: 0 },
          updatedAt: new Date().toISOString(),
        })}
      />,
    );
    expect(screen.getByText("3/3")).toBeInTheDocument();
  });
});
