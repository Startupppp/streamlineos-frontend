import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { HrSidebarNav } from "./hr-sidebar-nav";
import type { NavGroup, NavRoute } from "./sidebar-nav-types";

const Icon = ({ className }: { className?: string }) => (
  <svg aria-hidden="true" className={className} />
);

jest.mock("next/navigation", () => ({
  usePathname: () => "/hr",
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: function Link({
    children,
    href,
    prefetch: _prefetch,
    ...rest
  }: React.PropsWithChildren<
    React.AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }
  >) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  },
}));

jest.mock("@/components/layout/nav-intent-prefetch", () => ({
  useNavIntentPrefetch: () => jest.fn(),
}));

jest.mock("@/components/layout/nav-pending-indicator", () => ({
  NavPendingIndicator: () => null,
}));

function route(label: string, href: string, children?: NavRoute[]): NavRoute {
  return { label, href, icon: Icon, children };
}

const groups: NavGroup[] = [
  {
    label: "HR Overview",
    product: "hrms",
    routes: [route("Hub", "/hr"), route("Action Center", "/hr/approvals")],
  },
  {
    label: "HR People",
    product: "hrms",
    routes: [
      route("People", "/hr/employees", [
        route("Org Chart", "/hr/org-chart"),
        route("Positions", "/hr/positions"),
      ]),
    ],
  },
];

function renderNav(showAdvanced = false) {
  const onShowAdvancedChange = jest.fn();
  render(
    <HrSidebarNav
      groups={groups}
      isCollapsed={false}
      collapsedGroups={{}}
      onToggleGroup={jest.fn()}
      pendingLeaves={0}
      inboxCount={0}
      accent={{ text: "", bg: "", indicator: "", border: "" }}
      showAdvanced={showAdvanced}
      onShowAdvancedChange={onShowAdvancedChange}
    />,
  );
  return { onShowAdvancedChange };
}

describe("HrSidebarNav", () => {
  it("offers find and the simple/advanced depth the settings page already stores", () => {
    const { onShowAdvancedChange } = renderNav();

    expect(screen.getByRole("searchbox", { name: "Find a page in HR" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Simple" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Advanced" })).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByRole("button", { name: "Advanced" }));
    expect(onShowAdvancedChange).toHaveBeenCalledWith(true);
  });

  it("narrows the tree to pages that match the query", () => {
    renderNav();

    fireEvent.change(screen.getByRole("searchbox", { name: "Find a page in HR" }), {
      target: { value: "org" },
    });

    expect(screen.getByRole("link", { name: "Org Chart" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Action Center" })).not.toBeInTheDocument();
  });

  it("says when the query matches nothing", () => {
    renderNav();

    fireEvent.change(screen.getByRole("searchbox", { name: "Find a page in HR" }), {
      target: { value: "zzzz" },
    });

    expect(screen.getByRole("status")).toHaveTextContent('No pages match “zzzz”.');
  });
});
