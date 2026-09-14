/** @jest-environment node */

/**
 * Local first-response proof for the public half of c8. These tests invoke the
 * real async route components and serialize their returned server tree. There
 * is no browser fetch or hydration step available to put the supplied records
 * into the markup, so a regression to a client-only shell fails here.
 */
jest.mock("server-only", () => ({}));

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

jest.mock("@/lib/public-fetch", () => ({
  publicGet: jest.fn(),
}));

jest.mock("@/features/help-centre/components/public-help-centre-content", () => ({
  PublicHelpCentreContent: ({ orgName, data }: { orgName: string; data: { articles: Array<{ title: string }> } }) => (
    <main><h1>{orgName}</h1>{data.articles.map((article) => <article key={article.title}>{article.title}</article>)}</main>
  ),
}));

jest.mock("@/features/help-centre/components/public-article-content", () => ({
  PublicArticleContent: ({ article }: { article: { title: string; content: string } }) => (
    <main><h1>{article.title}</h1><article>{article.content}</article></main>
  ),
}));

import { renderToStaticMarkup } from "react-dom/server";
import { publicGet } from "@/lib/public-fetch";
import PublicHelpCentreLandingPage from "@/app/(public)/help/[orgId]/page";
import PublicHelpArticlePage from "@/app/(public)/help/[orgId]/[articleSlug]/page";

const mockedPublicGet = publicGet as jest.Mock;

describe("public Help Centre first HTML", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders landing data into the first server HTML", async () => {
    mockedPublicGet
      .mockResolvedValueOnce({ name: "Acme Support" })
      .mockResolvedValueOnce({ categories: [], articles: [{ title: "Reset your password" }] });

    const tree = await PublicHelpCentreLandingPage({ params: Promise.resolve({ orgId: "acme" }) });
    const html = renderToStaticMarkup(tree);

    expect(html).toContain("Acme Support");
    expect(html).toContain("Reset your password");
  });

  it("renders article data into the first server HTML", async () => {
    mockedPublicGet.mockResolvedValueOnce({
      title: "Reset your password",
      content: "Use the account recovery link.",
    });

    const tree = await PublicHelpArticlePage({
      params: Promise.resolve({ orgId: "acme", slug: "reset-password" }),
    });
    const html = renderToStaticMarkup(tree);

    expect(html).toContain("Reset your password");
    expect(html).toContain("Use the account recovery link.");
  });
});
