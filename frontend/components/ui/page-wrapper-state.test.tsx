import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PageWrapper } from "./page-wrapper";

describe("PageWrapper state", () => {
  it("renders children untouched when no state is supplied, so existing pages cannot change", () => {
    render(
      <TooltipProvider>
        <PageWrapper title="Employees" actions={<button type="button">Add</button>}>
          <div>table</div>
        </PageWrapper>
      </TooltipProvider>,
    );
    expect(screen.getByText("table")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("keeps the title but withdraws the actions a denied reader cannot use", () => {
    render(
      <TooltipProvider>
        <PageWrapper
          title="Employees"
          actions={<button type="button">Add</button>}
          filters={<input aria-label="Search" />}
          state={{ kind: "denied", permission: "hr:employees:view" }}
          loading={<div data-testid="skeleton" />}
        >
          <div>table</div>
        </PageWrapper>
      </TooltipProvider>,
    );

    expect(screen.getByRole("heading", { name: "Employees" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add" })).toBeNull();
    expect(screen.queryByLabelText("Search")).toBeNull();
    expect(screen.queryByText("table")).toBeNull();
  });

  it("keeps the actions when the state is ready", () => {
    render(
      <TooltipProvider>
        <PageWrapper
          title="Employees"
          actions={<button type="button">Add</button>}
          state={{ kind: "ready" }}
          loading={<div data-testid="skeleton" />}
        >
          <div>table</div>
        </PageWrapper>
      </TooltipProvider>,
    );
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    expect(screen.getByText("table")).toBeInTheDocument();
  });

  it("keeps the actions while the body loads, so a slow read does not hide the primary action (QA 2026-10-13)", () => {
    render(
      <TooltipProvider>
        <PageWrapper
          title="Employees"
          actions={<button type="button">Add</button>}
          filters={<input aria-label="Search" />}
          state={{ kind: "loading" }}
          loading={<div data-testid="skeleton" />}
        >
          <div>table</div>
        </PageWrapper>
      </TooltipProvider>,
    );
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    expect(screen.queryByText("table")).toBeNull();
  });
});
