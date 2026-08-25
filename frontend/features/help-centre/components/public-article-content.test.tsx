jest.mock("server-only", () => ({}));

jest.mock("./public-article-feedback", () => ({
  PublicArticleFeedback: () => null,
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

import { render } from "@testing-library/react";
import { PublicArticleContent } from "./public-article-content";
import type { PublicKbArticle } from "@/lib/public-fetch";

const ARTICLE_BODY = "<p>Getting started with StreamlineOS is easy.</p><h2>Step one</h2><p>Create your account.</p>";

const mockArticle: PublicKbArticle = {
  id: 1,
  title: "Getting started guide",
  slug: "getting-started",
  excerpt: "Everything you need to get up and running.",
  content: ARTICLE_BODY,
  categoryId: 2,
  categoryName: "Guides",
  categorySlug: "guides",
  views: 120,
  helpfulCount: 10,
  notHelpfulCount: 2,
  tags: ["onboarding", "setup"],
  seoTitle: "Getting Started | StreamlineOS Help",
  seoDescription: "Learn how to get started.",
  publishedAt: "2024-03-01T00:00:00.000Z",
  updatedAt: "2024-03-15T00:00:00.000Z",
};

describe("PublicArticleContent", () => {
  it("includes the article body text in the rendered markup", () => {
    const { container } = render(
      <PublicArticleContent article={mockArticle} orgId="org-1" />,
    );
    expect(container.innerHTML).toContain("Getting started with StreamlineOS is easy.");
  });

  it("renders the article title as an h1", () => {
    const { getByRole } = render(
      <PublicArticleContent article={mockArticle} orgId="org-1" />,
    );
    const heading = getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Getting started guide");
  });

  it("renders the category name", () => {
    const { getByText } = render(
      <PublicArticleContent article={mockArticle} orgId="org-1" />,
    );
    expect(getByText("Guides")).toBeInTheDocument();
  });

  it("renders a back link to the help centre index", () => {
    const { getByRole } = render(
      <PublicArticleContent article={mockArticle} orgId="org-abc" />,
    );
    const link = getByRole("link", { name: /back to help center/i });
    expect(link).toHaveAttribute("href", "/help/org-abc");
  });

  it("renders a table of contents for headings found in the content", () => {
    const { getByRole } = render(
      <PublicArticleContent article={mockArticle} orgId="org-1" />,
    );
    const nav = getByRole("navigation", { name: /table of contents/i });
    expect(nav).toBeInTheDocument();
    expect(nav.textContent).toContain("Step one");
  });

  it("renders article tags", () => {
    const { getByText } = render(
      <PublicArticleContent article={mockArticle} orgId="org-1" />,
    );
    expect(getByText("onboarding")).toBeInTheDocument();
    expect(getByText("setup")).toBeInTheDocument();
  });

  it("renders the excerpt as a paragraph", () => {
    const { getByText } = render(
      <PublicArticleContent article={mockArticle} orgId="org-1" />,
    );
    expect(getByText("Everything you need to get up and running.")).toBeInTheDocument();
  });
});
