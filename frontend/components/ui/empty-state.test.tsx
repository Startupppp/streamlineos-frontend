import { fireEvent, render, screen } from "@testing-library/react";
import { permissionGate } from "@/lib/rbac/permission-gate";
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
});

describe("EmptyState — announcement", () => {
  it("announces an empty result, which is the answer the reader is waiting on", () => {
    render(
      <EmptyState
        title="No pending approvals"
        description="Nothing is waiting on you."
      />,
    );

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("No pending approvals");
    expect(status).toHaveTextContent("Nothing is waiting on you.");
  });

  it("announces the compact variant on the same terms", () => {
    render(<EmptyState title="No results" compact />);

    expect(screen.getByRole("status")).toHaveTextContent("No results");
  });

  it("still announces a refused read through the access branch", () => {
    render(
      <EmptyState
        title="No pending approvals"
        access={permissionGate("crm:autonomy:view", false, true)}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Access Restricted");
  });

  it("announces an unresolved gate as emptiness rather than refusal", () => {
    render(
      <EmptyState
        title="No pending approvals"
        access={permissionGate("crm:autonomy:view", false, false)}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("No pending approvals");
  });

  it("exposes exactly one live region so the two branches never double-announce", () => {
    render(<EmptyState title="No results" />);

    expect(screen.getAllByRole("status")).toHaveLength(1);
  });
});
