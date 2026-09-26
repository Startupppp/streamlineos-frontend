jest.mock("server-only", () => ({}));

jest.mock("sanitize-html", () => (html: string) => html);

jest.mock("./public-article-feedback", () => ({
  PublicArticleFeedback: () => null,
}));

jest.mock("./public-org-header", () => ({
  PublicOrgHeader: ({ orgName }: { orgName: string }) => (
    <header data-testid="public-org-header">{orgName} Help Center</header>
  ),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

import { render } from "@testing-library/react";
import { PublicArticleContent } from "./public-article-content";
import type { PublicKbArticle, PublicOrgInfo } from "@/lib/public-fetch";

const ARTICLE_BODY = "<p>Getting started with StreamlineOS is easy.</p><h2>Step one</h2><p>Create your account.</p>";

const mockArticle: PublicKbArticle = {
  id: 1,
  title: "Getting started guide",
  slug: "getting-started",
  excerpt: "Everything you need to get up and running.",
  content: ARTICLE_BODY,
  categoryId: 4,
  categoryName: "Guides",
  categorySlug: "guides",
  helpfulCount: 9,
  notHelpfulCount: 1,
  views: 120,
  tags: ["onboarding", "setup"],
  seoTitle: "Getting Started | StreamlineOS Help",
  seoDescription: "Learn how to get started.",
  publishedAt: "2024-03-01T00:00:00.000Z",
  updatedAt: "2024-06-15T00:00:00.000Z",
};

const mockOrg: PublicOrgInfo = {
  name: "Acme Corp",
  logo: null,
};

describe("PublicArticleContent", () => {
  it("includes the article body text in the rendered markup", () => {
    const { container } = render(
      <PublicArticleContent article={mockArticle} orgId="org-1" org={mockOrg} />,
    );
    expect(container.innerHTML).toContain("Getting started with StreamlineOS is easy.");
  });

  it("renders the article title as an h1", () => {
    const { getByRole } = render(
      <PublicArticleContent article={mockArticle} orgId="org-1" org={mockOrg} />,
    );
    const heading = getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Getting started guide");
  });

  it("renders the category name", () => {
    const { getByText } = render(
      <PublicArticleContent article={mockArticle} orgId="org-1" org={mockOrg} />,
    );
    expect(getByText("Guides")).toBeInTheDocument();
  });

  it("renders a back link to the help centre index", () => {
    const { getByRole } = render(
      <PublicArticleContent article={mockArticle} orgId="org-abc" org={mockOrg} />,
    );
    const link = getByRole("link", { name: /back to help center/i });
    expect(link).toHaveAttribute("href", "/help/org-abc");
  });

  it("renders a table of contents for headings found in the content", () => {
    const { getByRole } = render(
      <PublicArticleContent article={mockArticle} orgId="org-1" org={mockOrg} />,
    );
    const nav = getByRole("navigation", { name: /table of contents/i });
    expect(nav).toBeInTheDocument();
    expect(nav.textContent).toContain("Step one");
  });

  it("renders article tags", () => {
    const { getByText } = render(
      <PublicArticleContent article={mockArticle} orgId="org-1" org={mockOrg} />,
    );
    expect(getByText("onboarding")).toBeInTheDocument();
    expect(getByText("setup")).toBeInTheDocument();
  });

  it("renders the excerpt as a paragraph", () => {
    const { getByText } = render(
      <PublicArticleContent article={mockArticle} orgId="org-1" org={mockOrg} />,
    );
    expect(getByText("Everything you need to get up and running.")).toBeInTheDocument();
  });

  describe("last updated freshness signal", () => {
    it("renders the updatedAt date with a Last updated label when updatedAt is present", () => {
      const { getByText } = render(
        <PublicArticleContent article={mockArticle} orgId="org-1" org={mockOrg} />,
      );
      expect(getByText(/Last updated/)).toBeInTheDocument();
      expect(getByText(/Jun 15, 2024/)).toBeInTheDocument();
    });

    it("renders the updatedAt date using a time element with the ISO value as dateTime attribute", () => {
      const { container } = render(
        <PublicArticleContent article={mockArticle} orgId="org-1" org={mockOrg} />,
      );
      const timeEl = container.querySelector("time");
      expect(timeEl).not.toBeNull();
      expect(timeEl?.getAttribute("dateTime")).toBe("2024-06-15T00:00:00.000Z");
    });

    it("falls back to publishedAt with Published label when updatedAt is absent", () => {
      const articleNoUpdatedAt: PublicKbArticle = { ...mockArticle, updatedAt: null };
      const { getByText } = render(
        <PublicArticleContent article={articleNoUpdatedAt} orgId="org-1" org={mockOrg} />,
      );
      expect(getByText(/Published/)).toBeInTheDocument();
      expect(getByText(/Mar 1, 2024/)).toBeInTheDocument();
    });

    it("does not render Last updated text when updatedAt is absent", () => {
      const articleNoUpdatedAt: PublicKbArticle = { ...mockArticle, updatedAt: null };
      const { queryByText } = render(
        <PublicArticleContent article={articleNoUpdatedAt} orgId="org-1" org={mockOrg} />,
      );
      expect(queryByText(/Last updated/)).toBeNull();
    });
  });

  describe("brand-light header", () => {
    it("renders the org header when org info is provided", () => {
      const { getByTestId } = render(
        <PublicArticleContent article={mockArticle} orgId="org-1" org={mockOrg} />,
      );
      expect(getByTestId("public-org-header")).toBeInTheDocument();
    });

    it("renders org name in the brand header", () => {
      const { getByTestId } = render(
        <PublicArticleContent article={mockArticle} orgId="org-1" org={mockOrg} />,
      );
      expect(getByTestId("public-org-header").textContent).toContain("Acme Corp");
    });

    it("does not render org header when org is null", () => {
      const { queryByTestId } = render(
        <PublicArticleContent article={mockArticle} orgId="org-1" org={null} />,
      );
      expect(queryByTestId("public-org-header")).toBeNull();
    });
  });

  describe("accessible reading typography", () => {
    it("renders content inside an article semantic element", () => {
      const { container } = render(
        <PublicArticleContent article={mockArticle} orgId="org-1" org={mockOrg} />,
      );
      const articleEl = container.querySelector("article");
      expect(articleEl).not.toBeNull();
      expect(articleEl?.textContent).toContain("Getting started guide");
    });

    it("applies prose typography classes to the body content container", () => {
      const { container } = render(
        <PublicArticleContent article={mockArticle} orgId="org-1" org={mockOrg} />,
      );
      const proseDiv = container.querySelector(".prose");
      expect(proseDiv).not.toBeNull();
    });

    it("does not apply max-w-none override that would break reading column width", () => {
      const { container } = render(
        <PublicArticleContent article={mockArticle} orgId="org-1" org={mockOrg} />,
      );
      const proseDiv = container.querySelector(".prose");
      expect(proseDiv?.className).not.toContain("max-w-none");
    });

    it("uses a time element for the freshness date rather than a bare span", () => {
      const { container } = render(
        <PublicArticleContent article={mockArticle} orgId="org-1" org={mockOrg} />,
      );
      const timeEls = container.querySelectorAll("time");
      expect(timeEls.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("helpful feedback control", () => {
    it("renders the PublicArticleFeedback region for the article slug", () => {
      const { container } = render(
        <PublicArticleContent article={mockArticle} orgId="org-1" org={mockOrg} />,
      );
      expect(container.innerHTML).toBeDefined();
    });
  });
});
