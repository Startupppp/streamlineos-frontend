import {
  publicKbListContract,
  publicKbArticleContract,
  publicWikiPageContract,
} from "@/lib/public-schema";

const BACKEND_KB_LIST_PAYLOAD = {
  categories: [
    {
      id: 1,
      name: "Getting Started",
      slug: "getting-started",
      description: "Everything you need to get up and running.",
      icon: "🚀",
      sortOrder: 0,
    },
  ],
  articles: [
    {
      id: 42,
      categoryId: 1,
      title: "How to onboard",
      slug: "how-to-onboard",
      excerpt: "Step-by-step guide.",
      views: 100,
      helpfulCount: 20,
      notHelpfulCount: 3,
      tags: ["onboarding", "guide"],
      publishedAt: "2025-01-15T10:00:00.000Z",
    },
  ],
  pagination: { limit: 20, hasMore: false, nextCursor: null },
};

const BACKEND_KB_ARTICLE_PAYLOAD = {
  id: 42,
  title: "How to onboard",
  slug: "how-to-onboard",
  content: "Full article text.",
  excerpt: "Step-by-step guide.",
  categoryId: 1,
  categoryName: "Getting Started",
  categorySlug: "getting-started",
  seoTitle: "Onboarding guide",
  seoDescription: "Learn how to onboard.",
  tags: ["onboarding"],
  views: 101,
  helpfulCount: 20,
  notHelpfulCount: 3,
  publishedAt: "2025-01-15T10:00:00.000Z",
  updatedAt: "2025-06-01T12:00:00.000Z",
};

const BACKEND_WIKI_PAGE_PAYLOAD = {
  title: "Team handbook",
  icon: "📖",
  coverImage: "gradient:ocean",
  content: { type: "doc", content: [] },
  updatedAt: "2025-06-15T09:00:00.000Z",
};

describe("publicKbListContract — backend field parity", () => {
  it("accepts a full backend payload and does not strip category or article fields", () => {
    const result = publicKbListContract.safeParse(BACKEND_KB_LIST_PAYLOAD);
    expect(result.success).toBe(true);
    if (!result.success) return;
    const cat = result.data.categories[0];
    expect(cat).toBeDefined();
    expect(cat?.description).toBe("Everything you need to get up and running.");
    expect(cat?.icon).toBe("🚀");
    expect(cat?.sortOrder).toBe(0);
    const art = result.data.articles[0];
    expect(art).toBeDefined();
    expect(art?.categoryId).toBe(1);
    expect(art?.views).toBe(100);
    expect(art?.helpfulCount).toBe(20);
    expect(art?.notHelpfulCount).toBe(3);
    expect(art?.tags).toEqual(["onboarding", "guide"]);
  });

  it("accepts nullable fields as null", () => {
    const payload = {
      ...BACKEND_KB_LIST_PAYLOAD,
      categories: [
        {
          id: 2,
          name: "Advanced",
          slug: "advanced",
          description: null,
          icon: null,
          sortOrder: 1,
        },
      ],
      articles: [
        {
          ...BACKEND_KB_LIST_PAYLOAD.articles[0],
          categoryId: null,
          views: null,
          helpfulCount: null,
          notHelpfulCount: null,
        },
      ],
    };
    const result = publicKbListContract.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("rejects a payload that omits the sortOrder field on a category", () => {
    const payload = {
      ...BACKEND_KB_LIST_PAYLOAD,
      categories: [{ id: 1, name: "X", slug: "x", description: null, icon: null }],
    };
    const result = publicKbListContract.safeParse(payload);
    expect(result.success).toBe(false);
  });
});

describe("publicKbArticleContract — backend field parity", () => {
  it("accepts a full backend payload and retains all fields", () => {
    const result = publicKbArticleContract.safeParse(BACKEND_KB_ARTICLE_PAYLOAD);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.categoryId).toBe(1);
    expect(result.data.categorySlug).toBe("getting-started");
    expect(result.data.helpfulCount).toBe(20);
    expect(result.data.notHelpfulCount).toBe(3);
  });

  it("accepts null for optional reference fields when article has no category", () => {
    const payload = {
      ...BACKEND_KB_ARTICLE_PAYLOAD,
      categoryId: null,
      categoryName: null,
      categorySlug: null,
    };
    const result = publicKbArticleContract.safeParse(payload);
    expect(result.success).toBe(true);
  });
});

describe("publicWikiPageContract — backend field parity", () => {
  it("accepts a full backend payload with a record content block", () => {
    const result = publicWikiPageContract.safeParse(BACKEND_WIKI_PAGE_PAYLOAD);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.title).toBe("Team handbook");
    expect(result.data.updatedAt).toBe("2025-06-15T09:00:00.000Z");
  });

  it("accepts an array content block", () => {
    const result = publicWikiPageContract.safeParse({
      ...BACKEND_WIKI_PAGE_PAYLOAD,
      content: [{ type: "paragraph", content: [] }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts null content and null updatedAt without substituting today's date", () => {
    const result = publicWikiPageContract.safeParse({
      ...BACKEND_WIKI_PAGE_PAYLOAD,
      content: null,
      updatedAt: null,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.updatedAt).toBeNull();
  });

  it("rejects a payload whose updatedAt is a non-string non-null value", () => {
    const result = publicWikiPageContract.safeParse({
      ...BACKEND_WIKI_PAGE_PAYLOAD,
      updatedAt: 1_234_567_890,
    });
    expect(result.success).toBe(false);
  });
});
