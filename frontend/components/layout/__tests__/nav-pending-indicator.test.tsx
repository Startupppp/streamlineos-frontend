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
