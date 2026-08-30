import { fireEvent, render, screen } from "@testing-library/react";
import { EmptyState } from "./empty-state";

jest.mock("next/link", () => {
  return function Link({
    children,
    href,
    ...props
  }: React.PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement>>) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

jest.mock("@/components/illustrations/state-illustration", () => ({
  StateIllustration: () => <svg data-testid="state-illustration" />,
}));

describe("EmptyState — semantic structure", () => {
  it("renders a heading so screen readers can identify the state", () => {
    render(<EmptyState title="No results" />);
    expect(screen.getByRole("heading", { name: "No results" })).toBeInTheDocument();
  });

  it("renders the description beneath the heading", () => {
    render(<EmptyState title="No results" description="Try adjusting your filters." />);
    expect(screen.getByText("Try adjusting your filters.")).toBeInTheDocument();
  });

  it("renders a primary action as a button reachable by keyboard", () => {
    const handleAction = jest.fn();
    render(
      <EmptyState
        title="No invoices"
        action={{ label: "Create invoice", onClick: handleAction }}
      />,
    );
    const btn = screen.getByRole("button", { name: "Create invoice" });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it("renders a secondary action alongside the primary", () => {
    render(
      <EmptyState
        title="No invoices"
        action={{ label: "Create invoice", onClick: jest.fn() }}
        secondaryAction={{ label: "Learn more", onClick: jest.fn() }}
      />,
    );
    expect(screen.getByRole("button", { name: "Create invoice" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Learn more" })).toBeInTheDocument();
  });

  it("renders an action link as an anchor when href is provided", () => {
    render(
      <EmptyState
        title="No branches"
        action={{ label: "Add branch", href: "/settings/branches/new" }}
      />,
    );
    const link = screen.getByRole("link", { name: "Add branch" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/settings/branches/new");
  });

  it("renders no action controls when neither action is provided", () => {
    render(<EmptyState title="Nothing here" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders the compact variant without the dashed-border panel chrome", () => {
    const { container } = render(<EmptyState title="Empty" compact />);
    expect(container.firstElementChild).not.toHaveClass("border-dashed");
  });

  it("shows the default illustration so the empty state is never a blank canvas", () => {
    render(<EmptyState title="No data" />);
    expect(screen.getByTestId("state-illustration")).toBeInTheDocument();
  });

  it("replaces the data-empty title when filtersActive is true", () => {
    render(
      <EmptyState
        title="No contacts yet"
        filtersActive
        onClearFilters={jest.fn()}
      />,
    );
    // "No contacts yet" would tell the user nothing exists org-wide, which is
    // false while a filter is hiding rows.
    expect(screen.queryByText("No contacts yet")).not.toBeInTheDocument();
    expect(screen.getByText("No results match your filters.")).toBeInTheDocument();
  });

  it("keeps the data-empty title when no filters are active", () => {
    render(<EmptyState title="No contacts yet" />);
    expect(screen.getByText("No contacts yet")).toBeInTheDocument();
    expect(screen.queryByText("No results match your filters.")).not.toBeInTheDocument();
  });

  it("lets a caller override the filtered heading", () => {
    render(
      <EmptyState
        title="No contacts yet"
        filtersActive
        filteredTitle="No contacts match this search"
        onClearFilters={jest.fn()}
      />,
    );
    expect(screen.getByText("No contacts match this search")).toBeInTheDocument();
  });

  it("renders a Clear filters button when filtersActive is true", () => {
    const handleClear = jest.fn();
    render(
      <EmptyState
        title="No results"
        filtersActive
        onClearFilters={handleClear}
      />,
    );
    const btn = screen.getByRole("button", { name: "Clear filters" });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it("suppresses the create action when filtersActive is true", () => {
    render(
      <EmptyState
        title="No results"
        filtersActive
        action={{ label: "Create item", onClick: jest.fn() }}
      />,
    );
    expect(screen.queryByRole("button", { name: "Create item" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeInTheDocument();
  });
});
