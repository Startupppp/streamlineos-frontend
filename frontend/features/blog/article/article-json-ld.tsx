import type { BlogArticle } from "@/lib/blog/contracts";
import { JOURNAL_NAME, ORGANIZATION_ID, SITE_ORIGIN, blogUrl, jsonLd } from "@/lib/blog/seo";

/** BlogPosting + BreadcrumbList describing exactly what the page shows. */
export function ArticleJsonLd({ article }: { article: BlogArticle }) {
  const url = blogUrl(`/${article.slug}`);
  const image = article.socialImage ?? article.cover?.src ?? null;
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${url}#article`,
        headline: article.title,
        description: article.metaDescription ?? article.excerpt,
        ...(image ? { image: [image] } : {}),
        datePublished: article.publishedAt,
        dateModified: article.modifiedAt ?? article.publishedAt,
        ...(article.author ? { author: { "@type": "Person", name: article.author.name, url: blogUrl(`/author/${article.author.slug}`) } } : {}),
        publisher: { "@id": ORGANIZATION_ID },
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        isPartOf: { "@type": "Blog", "@id": `${blogUrl()}#blog`, name: JOURNAL_NAME },
        ...(article.category ? { articleSection: article.category.name } : {}),
        ...(article.tags.length ? { keywords: article.tags.join(", ") } : {}),
        inLanguage: "en",
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_ORIGIN}/` },
          { "@type": "ListItem", position: 2, name: "Journal", item: blogUrl() },
          ...(article.category ? [{ "@type": "ListItem", position: 3, name: article.category.name, item: blogUrl(`/category/${article.category.slug}`) }] : []),
          { "@type": "ListItem", position: article.category ? 4 : 3, name: article.title, item: url },
        ],
      },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(data) }} />;
}
