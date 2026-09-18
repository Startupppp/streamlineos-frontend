import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils/render";
import WikiSidebarNav from "./wiki-sidebar-nav";

jest.mock("next/navigation", () => ({
  usePathname: () => "/knowledge/wiki/recent",
}));

describe("WikiSidebarNav — wiki hides the Documents product sidebar", () => {
  it("keeps Ask KB as a list destination, not a tab", () => {
    renderWithProviders(
      <WikiSidebarNav
        canViewAnalytics={false}
        canViewReviews={false}
        canManageSettings={false}
      />,
    );

    const askKb = screen.getByRole("link", { name: "Ask KB" });
    expect(askKb).toHaveAttribute("href", "/knowledge/chat");
    expect(askKb).not.toHaveAttribute("aria-current");
    expect(screen.queryByRole("navigation", { name: "Documents" })).toBeNull();
  });

  it("keeps Ask KB in the collapsed wiki rail", () => {
    renderWithProviders(
      <WikiSidebarNav
        isCollapsed
        canViewAnalytics={false}
        canViewReviews={false}
        canManageSettings={false}
      />,
    );

    expect(screen.getByRole("link", { name: "Ask KB" })).toHaveAttribute(
      "href",
      "/knowledge/chat",
    );
  });
});
