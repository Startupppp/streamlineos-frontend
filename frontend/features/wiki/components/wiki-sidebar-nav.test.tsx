import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils/render";
import WikiSidebarNav from "./wiki-sidebar-nav";

jest.mock("next/navigation", () => ({
  usePathname: () => "/knowledge/wiki",
}));

describe("WikiSidebarNav — company documents", () => {
  it("does not list company documents unless HR documents are switched on", () => {
    renderWithProviders(<WikiSidebarNav canViewAnalytics={false} canViewReviews={false} canManageContent={false} />);

    expect(screen.queryByRole("link", { name: "Company documents" })).toBeNull();
  });

  it("lists company documents next to the other places a reader browses once they are switched on", () => {
    renderWithProviders(<WikiSidebarNav canViewAnalytics={false} canViewReviews={false} canManageContent={false} showCompanyDocuments />);

    expect(screen.getByRole("link", { name: "Company documents" })).toHaveAttribute("href", "/knowledge/wiki/company-documents");
    expect(screen.getByRole("link", { name: "My pages" })).toBeInTheDocument();
  });

  it("labels the owned-pages destination My pages, matching the heading that route renders, not the retired Private wording", () => {
    renderWithProviders(<WikiSidebarNav canViewAnalytics={false} canViewReviews={false} canManageContent={false} />);

    expect(screen.getByRole("link", { name: "My pages" })).toHaveAttribute("href", "/knowledge/wiki/private");
    expect(screen.queryByRole("link", { name: "Private" })).toBeNull();
  });
});

describe("WikiSidebarNav — wiki hides the Documents product sidebar", () => {
  it("keeps Ask KB as a list destination, not a tab", () => {
    renderWithProviders(
      <WikiSidebarNav
        canViewAnalytics={false}
        canViewReviews={false}
        canManageContent={false}
      />,
    );

    const askKb = screen.getByRole("link", { name: "Ask KB" });
    expect(askKb).toHaveAttribute("href", "/knowledge/chat");
    expect(askKb).not.toHaveAttribute("aria-current");
    expect(screen.queryByRole("navigation", { name: "Documents" })).toBeNull();
  });

  it("mounts wiki accordion groups without looping", () => {
    renderWithProviders(
      <WikiSidebarNav
        canViewAnalytics={false}
        canViewReviews={false}
        canManageContent={false}
      />,
    );

    expect(screen.getByRole("link", { name: "My pages" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Templates" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Settings" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Recent" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Favorites" })).toBeNull();
  });

  it("keeps Ask KB in the collapsed wiki rail", () => {
    renderWithProviders(
      <WikiSidebarNav
        isCollapsed
        canViewAnalytics={false}
        canViewReviews={false}
        canManageContent={false}
      />,
    );

    expect(screen.getByRole("link", { name: "Ask KB" })).toHaveAttribute(
      "href",
      "/knowledge/chat",
    );
  });

  it("omits Content Health when the actor cannot manage pages", () => {
    renderWithProviders(
      <WikiSidebarNav
        canViewAnalytics={false}
        canViewReviews={false}
        canManageContent={false}
      />,
    );

    expect(screen.queryByRole("link", { name: "Content Health" })).toBeNull();
  });

  it("links Content Health to /knowledge/wiki/manage when the actor can manage pages", () => {
    renderWithProviders(
      <WikiSidebarNav
        canViewAnalytics={false}
        canViewReviews={false}
        canManageContent
      />,
    );

    expect(
      screen.getByRole("link", { name: "Content Health" }),
    ).toHaveAttribute("href", "/knowledge/wiki/manage");
  });
});
