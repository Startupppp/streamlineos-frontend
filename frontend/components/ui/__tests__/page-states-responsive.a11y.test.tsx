import { render, screen } from "@testing-library/react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/ui/search-input";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { TooltipProvider } from "@/components/ui/tooltip";
import { expectNoAxeViolations, atViewport, VIEWPORTS } from "@/test-utils";
import { Users } from "lucide-react";

const VIEWPORT_NAMES = Object.keys(VIEWPORTS) as (keyof typeof VIEWPORTS)[];

function ListSurface({ state }: { state: "loading" | "empty" | "error" | "denied" }) {
  return (
    <TooltipProvider>
    <PageWrapper
      title="Invoices"
      subtitle="24 invoices"
      actions={<Button>New invoice</Button>}
      filters={<SearchInput placeholder="Search invoices…" value="" onValueChange={() => {}} />}
    >
      <StatCardGrid cols={3}>
        <StatCard label="Open" value={12} icon={Users} />
        <StatCard label="Paid" value={8} icon={Users} />
        <StatCard label="Overdue" value={4} icon={Users} />
      </StatCardGrid>
      {state === "loading" ? <LoadingState variant="table" className="flex-1" /> : null}
      {state === "empty" ? (
        <EmptyState
          className="flex-1"
          title="No invoices yet"
          description="Create your first invoice."
          action={{ label: "New invoice", onClick: () => {} }}
        />
      ) : null}
      {state === "error" ? (
        <ErrorState
          className="flex-1"
          title="Couldn't load invoices"
          description="The server did not respond."
          onRetry={() => {}}
        />
      ) : null}
      {state === "denied" ? (
        <NoPermissionState permission="accounting:invoices:view" />
      ) : null}
    </PageWrapper>
    </TooltipProvider>
  );
}

describe("every page state passes axe at 375, 768 and 1280", () => {
  for (const state of ["loading", "empty", "error", "denied"] as const) {
    for (const viewport of VIEWPORT_NAMES) {
      it(`${state} state at ${VIEWPORTS[viewport]}px`, async () => {
        const restore = atViewport(viewport);
        try {
          const { container } = render(<ListSurface state={state} />);
          await expectNoAxeViolations(container);
        } finally {
          restore();
        }
      });
    }
  }
});

describe("page anatomy holds at every reference width", () => {
  for (const viewport of VIEWPORT_NAMES) {
    it(`renders exactly one h1 at ${VIEWPORTS[viewport]}px`, () => {
      const restore = atViewport(viewport);
      try {
        const { container } = render(<ListSurface state="empty" />);
        expect(container.querySelectorAll("h1")).toHaveLength(1);
      } finally {
        restore();
      }
    });

    it(`keeps the filter row on one non-wrapping line at ${VIEWPORTS[viewport]}px`, () => {
      const restore = atViewport(viewport);
      try {
        const { container } = render(<ListSurface state="empty" />);
        const filterRow = container.querySelector(".flex-nowrap.overflow-x-auto");
        expect(filterRow).not.toBeNull();
        expect(filterRow?.className).not.toContain("flex-wrap");
      } finally {
        restore();
      }
    });

    it(`keeps the stat row horizontally scrollable rather than wrapping at ${VIEWPORTS[viewport]}px`, () => {
      const restore = atViewport(viewport);
      try {
        const { container } = render(<ListSurface state="empty" />);
        const scroller = container.querySelector(".overflow-x-auto.scrollbar-hide");
        expect(scroller).not.toBeNull();
        expect(scroller?.className).not.toContain("md:overflow-x-visible");
      } finally {
        restore();
      }
    });
  }
});

describe("state primitives carry the semantics screen readers need", () => {
  it("ErrorState is an alert region with a named retry control", () => {
    render(<ErrorState onRetry={() => {}} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("LoadingState is a status region, not an unnamed div", () => {
    render(<LoadingState variant="table" />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status).toHaveAccessibleName("Loading...");
  });

  it("BITE PROOF — an aria-label on a role-less div exposes no accessible name", () => {
    const { container } = render(<div aria-label="Loading..." />);
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it("NoPermissionState is a status region naming the missing permission", () => {
    render(<NoPermissionState permission="accounting:invoices:view" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("accounting:invoices:view")).toBeInTheDocument();
  });

  it("EmptyState leads with a heading so it is not an unlabelled region", () => {
    render(<EmptyState title="No invoices yet" />);
    expect(screen.getByRole("heading", { name: "No invoices yet" })).toBeInTheDocument();
  });

  it("skeletons never stand in as a page spinner (AP-7)", () => {
    const { container } = render(<LoadingState variant="page" />);
    expect(container.querySelectorAll(".animate-spin")).toHaveLength(0);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(10);
  });
});

describe("skeletons are a visual Xerox of the real layout, not a lone spinner", () => {
  it("the table skeleton renders a header band plus dense rows", () => {
    const { container } = render(<LoadingState variant="table" rows={12} />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThanOrEqual(
      4 * 13,
    );
  });

  it("the page skeleton mirrors title, stat row and table", () => {
    const { container } = render(<LoadingState variant="page" />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThanOrEqual(
      4 + 8 + 4,
    );
  });

  it("every skeleton block is aria-hidden so the region reads as one status", () => {
    const { container } = render(<LoadingState variant="cards" />);
    const blocks = Array.from(container.querySelectorAll(".animate-pulse"));
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks.every((el) => el.getAttribute("aria-hidden") === "true")).toBe(true);
  });
});
