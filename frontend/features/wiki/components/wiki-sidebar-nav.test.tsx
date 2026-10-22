import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils/render";
import WikiSidebarNav from "./wiki-sidebar-nav";

jest.mock("next/navigation", () => ({
  usePathname: () => "/knowledge/wiki",
}));

beforeEach(() => {
  localStorage.clear();
});

describe("WikiSidebarNav — focused document library", () => {
  it("keeps linked company documents out of the primary library navigation", () => {
    renderWithProviders(<WikiSidebarNav canViewSpaces={false} />);

    expect(screen.queryByRole("link", { name: "Company documents" })).toBeNull();
    expect(screen.getByRole("link", { name: "My files" })).toBeInTheDocument();
  });

  it("labels the owned-pages destination My files, matching the heading that route renders, not the retired Private wording", () => {
    renderWithProviders(<WikiSidebarNav canViewSpaces={false} />);

    expect(screen.getByRole("link", { name: "My files" })).toHaveAttribute("href", "/knowledge/wiki/private");
    expect(screen.queryByRole("link", { name: "Private" })).toBeNull();
  });
});

describe("WikiSidebarNav — approved IA: exactly 7 destinations, no Manage group", () => {
  it("shows all 7 approved destinations when canViewSpaces is true", () => {
    renderWithProviders(
      <WikiSidebarNav
        canViewSpaces
      />,
    );

    expect(screen.getByRole("link", { name: "Docs" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "My files" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Shared with me" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Team folders" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Templates" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Search" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Trash" })).toBeInTheDocument();
  });

  it("shows 6 destinations when canViewSpaces is false, omitting Team folders", () => {
    renderWithProviders(
      <WikiSidebarNav
        canViewSpaces={false}
      />,
    );

    expect(screen.getByRole("link", { name: "Docs" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "My files" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Shared with me" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Team folders" })).toBeNull();
    expect(screen.getByRole("link", { name: "Templates" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Search" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Trash" })).toBeInTheDocument();
  });

  it("contains no Manage accordion group — reviews, analytics, import and content health are gone from the sidebar", () => {
    renderWithProviders(
      <WikiSidebarNav
        canViewSpaces={false}
      />,
    );

    expect(screen.queryByRole("button", { name: "Manage" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Reviews" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Import & Export" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Analytics" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Content Health" })).toBeNull();
  });

  it("contains no Library accordion group either — the flat nav replaces both accordion groups", () => {
    renderWithProviders(
      <WikiSidebarNav
        canViewSpaces={false}
      />,
    );

    expect(screen.queryByRole("button", { name: "Library" })).toBeNull();
  });

  it("no Quick find button is rendered in the footer — it stays registered only via the ⌘K keyboard shortcut in the shell", () => {
    renderWithProviders(
      <WikiSidebarNav
        canViewSpaces={false}
      />,
    );

    expect(screen.queryByRole("button", { name: "Quick find" })).toBeNull();
    expect(screen.queryByText("Quick find")).toBeNull();
  });

  it("Trash is a nav link, not a footer-only item", () => {
    renderWithProviders(
      <WikiSidebarNav
        canViewSpaces={false}
      />,
    );

    expect(screen.getByRole("link", { name: "Trash" })).toHaveAttribute(
      "href",
      "/knowledge/wiki/trash",
    );
  });

  it("Search links to the KB search route", () => {
    renderWithProviders(
      <WikiSidebarNav
        canViewSpaces={false}
      />,
    );

    expect(screen.getByRole("link", { name: "Search" })).toHaveAttribute(
      "href",
      "/knowledge/wiki/search",
    );
  });

  it("Team folders links to the spaces route when canViewSpaces is granted", () => {
    renderWithProviders(
      <WikiSidebarNav
        canViewSpaces
      />,
    );

    expect(screen.getByRole("link", { name: "Team folders" })).toHaveAttribute(
      "href",
      "/knowledge/wiki/spaces",
    );
  });
});
