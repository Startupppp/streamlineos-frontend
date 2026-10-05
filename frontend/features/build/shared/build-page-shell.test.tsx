import { render, screen, fireEvent } from "@testing-library/react";
import { BuildPageShell } from "./build-page-shell";
import { buildEmptyEnvelope, addClause } from "@/lib/filter-envelope/filter-envelope-v1";

jest.mock("@/components/shared/page-shell", () => ({
  PageShell: ({
    title,
    filterBar,
    children,
  }: {
    title: React.ReactNode;
    filterBar?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div data-testid="page-shell">
      <div data-testid="title">{title}</div>
      {filterBar ? <div data-testid="filter-bar">{filterBar}</div> : null}
      <div data-testid="content">{children}</div>
    </div>
  ),
}));

jest.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

describe("BuildPageShell", () => {
  it("renders the title and children", () => {
    render(
      <BuildPageShell title="My Work">
        <span data-testid="child">tickets</span>
      </BuildPageShell>,
    );
    expect(screen.getByTestId("title")).toHaveTextContent("My Work");
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("renders a FilterGroup chip bar when filterEnvelope has clauses", () => {
    const envelope = addClause(buildEmptyEnvelope(), {
      field: "status",
      op: "is",
      value: "TODO",
    });
    render(
      <BuildPageShell
        title="All Work"
        filterEnvelope={envelope}
        onFilterEnvelopeChange={jest.fn()}
      >
        content
      </BuildPageShell>,
    );
    expect(screen.getByTestId("filter-bar")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Active filters" })).toBeInTheDocument();
  });

  it("does not render the filter-bar region when envelope has no clauses", () => {
    render(
      <BuildPageShell
        title="T"
        filterEnvelope={buildEmptyEnvelope()}
        onFilterEnvelopeChange={jest.fn()}
      >
        content
      </BuildPageShell>,
    );
    expect(screen.queryByTestId("filter-bar")).not.toBeInTheDocument();
  });

  it("clears all filters when 'Clear all' is clicked", () => {
    const handleChange = jest.fn();
    const envelope = addClause(buildEmptyEnvelope(), {
      field: "priority",
      op: "is",
      value: "HIGH",
    });
    render(
      <BuildPageShell
        title="T"
        filterEnvelope={envelope}
        onFilterEnvelopeChange={handleChange}
      >
        content
      </BuildPageShell>,
    );
    fireEvent.click(screen.getByRole("button", { name: /clear all/i }));
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ filters: [] }),
    );
  });

  it("renders the fallback filterBar prop when no filterEnvelope is provided", () => {
    render(
      <BuildPageShell
        title="T"
        filterBar={<div data-testid="custom-filter-bar">custom</div>}
      >
        content
      </BuildPageShell>,
    );
    expect(screen.getByTestId("custom-filter-bar")).toBeInTheDocument();
  });
});
