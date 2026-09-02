/**
 * App Router prefetches every `<Link>` that enters the viewport, and each
 * speculative RSC request re-runs the authenticated layout's session and
 * permission reads. A product sidebar carries up to 57 nav routes, so the
 * default behaviour turns one page load into dozens of backend round-trips
 * for routes nobody opened.
 *
 * These tests pin the two halves of the fix: viewport prefetch is off, and a
 * route is asked for once, on intent.
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

const prefetch = jest.fn();

jest.mock("next/navigation", () => ({
  usePathname: () => "/hr",
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch,
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
}));

const linkProps: Array<Record<string, unknown>> = [];

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    prefetch: prefetchProp,
    ...rest
  }: React.PropsWithChildren<{ href: string; prefetch?: boolean }>) => {
    linkProps.push({ href, prefetch: prefetchProp });
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  },
}));

jest.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: React.PropsWithChildren) => <>{children}</>,
  TooltipTrigger: ({ children }: React.PropsWithChildren<{ asChild?: boolean }>) => (
    <>{children}</>
  ),
  TooltipContent: () => null,
}));

import { SidebarSection } from "@/components/layout/sidebar/sidebar-section";
import type { NavGroup, ModuleAccent } from "@/components/layout/sidebar/sidebar-nav-items";

const Icon = ({ className }: { className?: string }) => (
  <svg aria-hidden="true" className={className} />
);

const accent: ModuleAccent = {
  bg: "bg-x",
  text: "text-x",
  indicator: "bg-y",
};

const group = {
  label: "People",
  product: "hr",
  routes: [
    { label: "Employees", icon: Icon, href: "/hr/employees" },
    { label: "Attendance", icon: Icon, href: "/hr/attendance" },
    { label: "Leaves", icon: Icon, href: "/hr/leaves" },
  ],
} as unknown as NavGroup;

function renderSection() {
  return render(
    <SidebarSection
      group={group}
      groupIndex={0}
      isCollapsed={false}
      showLabel
      isGroupCollapsed={false}
      pendingLeaves={0}
      accent={accent}
    />,
  );
}

describe("sidebar nav links do not fan out speculative prefetches", () => {
  beforeEach(() => {
    prefetch.mockClear();
    linkProps.length = 0;
  });

  it("opts every nav link out of viewport prefetch", () => {
    renderSection();

    expect(linkProps.length).toBeGreaterThanOrEqual(3);
    for (const props of linkProps) {
      expect(props.prefetch).toBe(false);
    }
  });

  it("prefetches nothing until a pointer or keyboard lands on a link", () => {
    renderSection();
    expect(prefetch).not.toHaveBeenCalled();
  });

  it("prefetches the hovered route, and only that route", () => {
    renderSection();

    fireEvent.mouseEnter(screen.getByRole("link", { name: /Attendance/ }));

    expect(prefetch).toHaveBeenCalledTimes(1);
    expect(prefetch).toHaveBeenCalledWith("/hr/attendance");
  });

  it("prefetches on keyboard focus, so tabbing is as fast as hovering", () => {
    renderSection();

    fireEvent.focus(screen.getByRole("link", { name: /Leaves/ }));

    expect(prefetch).toHaveBeenCalledWith("/hr/leaves");
  });

  it("asks for the same route once however many times it is hovered", () => {
    renderSection();
    const link = screen.getByRole("link", { name: /Employees/ });

    fireEvent.mouseEnter(link);
    fireEvent.focus(link);
    fireEvent.mouseEnter(link);

    expect(prefetch).toHaveBeenCalledTimes(1);
  });
});
