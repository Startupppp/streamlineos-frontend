import React from "react";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "@/components/ui/empty-state";
import { expectNoAxeViolations } from "@/test-utils/axe";
import { atViewport } from "@/test-utils/viewport";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...props
  }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

jest.mock("@/components/illustrations/state-illustration", () => ({
  StateIllustration: () => <svg data-testid="state-illustration" aria-hidden="true" />,
}));

jest.mock("@/components/shared/no-permission-state", () => ({
  NoPermissionState: ({ className }: { className?: string }) => (
    <div role="status" aria-label="No permission" className={className} />
  ),
}));

describe("EmptyState — axe accessibility", () => {
  it("passes axe at default (desktop) viewport", async () => {
    const { baseElement } = render(<EmptyState title="No records found" />);
    await expectNoAxeViolations(baseElement);
  });

  it("passes axe with a primary action", async () => {
    const { baseElement } = render(
      <EmptyState
        title="No records found"
        description="Add your first record to get started."
        action={{ label: "Add record", onClick: jest.fn() }}
      />,
    );
    await expectNoAxeViolations(baseElement);
  });

  it("passes axe with filters-active state (shows Clear filters button)", async () => {
    const { baseElement } = render(
      <EmptyState
        title="No results"
        filtersActive
        onClearFilters={jest.fn()}
      />,
    );
    await expectNoAxeViolations(baseElement);
  });

  it("passes axe at 375px (mobile)", async () => {
    const restore = atViewport("mobile");
    try {
      const { baseElement } = render(<EmptyState title="No records" />);
      await expectNoAxeViolations(baseElement);
    } finally {
      restore();
    }
  });

  it("passes axe at 768px (tablet)", async () => {
    const restore = atViewport("tablet");
    try {
      const { baseElement } = render(<EmptyState title="No records" />);
      await expectNoAxeViolations(baseElement);
    } finally {
      restore();
    }
  });
});

describe("EmptyState — BITE PROOF (axe catches missing heading)", () => {
  it("has a heading element so the empty state is not a blank region", () => {
    render(<EmptyState title="No invoices" />);
    expect(screen.getByRole("heading", { name: "No invoices" })).toBeInTheDocument();
  });

  it("would go red if the title were rendered as plain text without a heading role", () => {
    render(<EmptyState title="No employees" />);
    const heading = screen.queryByRole("heading", { name: "No employees" });
    expect(heading).toBeInTheDocument();
  });
});
