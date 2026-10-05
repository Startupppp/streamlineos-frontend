import { render, screen } from "@testing-library/react";
import { PageShell } from "./page-shell";

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({
    title,
    actions,
    filters,
    state,
    children,
  }: {
    title: React.ReactNode;
    actions?: React.ReactNode;
    filters?: React.ReactNode;
    state?: unknown;
    children: React.ReactNode;
  }) => {
    const { PageState } = jest.requireMock("@/components/shared/page-state") as {
      PageState: React.FC<{ children: React.ReactNode; resolution: unknown }>;
    };
    return (
      <div data-testid="page-wrapper">
        <header>
          <div data-testid="title">{title}</div>
          {actions ? <div data-testid="actions">{actions}</div> : null}
        </header>
        {filters ? (
          <div role="search" aria-label="Filters">
            {filters}
          </div>
        ) : null}
        <main>
          {state !== undefined ? (
            <PageState resolution={state}>{children}</PageState>
          ) : (
            children
          )}
        </main>
      </div>
    );
  },
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    children,
  }: {
    children: React.ReactNode;
    resolution: unknown;
  }) => <div data-testid="page-state">{children}</div>,
}));

describe("PageShell", () => {
  it("renders the title slot in the page wrapper", () => {
    render(<PageShell title="Projects">content</PageShell>);
    expect(screen.getByTestId("title")).toHaveTextContent("Projects");
  });

  it("renders the actions slot alongside freshness when both are provided", () => {
    render(
      <PageShell
        title="All Work"
        actions={<button type="button">Export</button>}
        dataUpdatedAt={Date.now() - 10_000}
      >
        content
      </PageShell>,
    );
    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
    expect(screen.getByText(/Updated/i)).toBeInTheDocument();
  });

  it("renders children inside the content container", () => {
    render(<PageShell title="T"><span data-testid="child">data</span></PageShell>);
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("renders the filter-bar slot via PageWrapper filters prop when provided", () => {
    render(
      <PageShell title="T" filterBar={<div>Filters</div>}>
        content
      </PageShell>,
    );
    expect(screen.getByRole("search")).toBeInTheDocument();
    expect(screen.getByText("Filters")).toBeInTheDocument();
  });

  it("does not render the filter-bar region when filterBar is not provided", () => {
    render(<PageShell title="T">content</PageShell>);
    expect(screen.queryByRole("search")).not.toBeInTheDocument();
  });

  it("shows 'Updated just now' when dataUpdatedAt is recent", () => {
    render(
      <PageShell title="T" dataUpdatedAt={Date.now() - 5_000}>
        content
      </PageShell>,
    );
    expect(screen.getByText("Updated just now")).toBeInTheDocument();
  });

  it("shows minutes when dataUpdatedAt is 90 seconds ago", () => {
    render(
      <PageShell title="T" dataUpdatedAt={Date.now() - 90_000}>
        content
      </PageShell>,
    );
    expect(screen.getByText("Updated 1 min ago")).toBeInTheDocument();
  });

  it("passes resolution to PageWrapper state so PageState wraps children", () => {
    render(
      <PageShell title="T" resolution={{ kind: "ready" }}>
        <span>ready</span>
      </PageShell>,
    );
    expect(screen.getByTestId("page-state")).toBeInTheDocument();
    expect(screen.getByText("ready")).toBeInTheDocument();
  });

  it("hides actions slot when neither actions nor dataUpdatedAt is set", () => {
    render(<PageShell title="T">content</PageShell>);
    expect(screen.queryByTestId("actions")).not.toBeInTheDocument();
  });
});
