/**
 * Ticket 27 turned viewport prefetch off for the sidebar, which was right — 57
 * speculative RSC requests per product re-ran the authenticated layout. The
 * cost is that a nav click now starts a cold navigation, and an authenticated
 * route on this app answers in 400-1000ms. Measured with
 * `scripts/measure-web-vitals.mjs`, tapping a nav link on the mobile profile
 * produced NO DOM change for up to 1,739ms — the interface looked frozen while
 * work ran, which is exactly what the perceived-responsiveness target forbids.
 *
 * `useLinkStatus` is Next's own answer for "prefetch is off and the
 * destination is dynamic". These tests pin the two properties the fix has to
 * have: the pending state reaches the DOM, and the indicator costs no layout
 * shift because it is present and absolutely positioned in both states.
 */
import React from "react";
import { render, screen } from "@testing-library/react";

let pending = false;

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...rest }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useLinkStatus: () => ({ pending }),
}));

import { NavPendingIndicator } from "@/components/layout/nav-pending-indicator";

function renderIndicator() {
  return render(
    <a href="/inbox" className="relative" data-testid="link">
      Inbox
      <NavPendingIndicator />
    </a>,
  );
}

describe("NavPendingIndicator", () => {
  afterEach(() => {
    pending = false;
  });

  it("marks the link pending the moment a navigation starts", () => {
    pending = true;
    renderIndicator();

    const indicator = screen.getByTestId("link").querySelector("[data-pending]");
    expect(indicator).not.toBeNull();
    expect(indicator?.getAttribute("data-pending")).toBe("true");
  });

  it("is still in the DOM when nothing is pending, so appearing costs no layout shift", () => {
    renderIndicator();

    const indicator = screen.getByTestId("link").querySelector("[data-pending]");
    expect(indicator).not.toBeNull();
    expect(indicator?.getAttribute("data-pending")).toBe("false");
    expect(indicator?.className).toContain("absolute");
    expect(indicator?.className).toContain("scale-x-0");
  });

  it("is hidden from assistive technology — the route change is the announcement", () => {
    pending = true;
    renderIndicator();

    const indicator = screen.getByTestId("link").querySelector("[data-pending]");
    expect(indicator?.getAttribute("aria-hidden")).toBe("true");
  });
});
