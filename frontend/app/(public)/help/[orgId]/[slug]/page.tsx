import type { Metadata } from "next";
import { ArticleReader } from "./article-reader";
import { getPublicKbArticleMeta } from "@/server/queries/public-kb";
import { BRAND_NAME, BRAND_URL } from "@/lib/branding";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ orgId: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgId, slug } = await params;
  const article = await getPublicKbArticleMeta(orgId, slug);
  if (!article) return { title: "Article not found" };

  const title = article.seoTitle || article.title;
  const description = article.seoDescription || article.excerpt || undefined;
  const canonical = `/help/${orgId}/${slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "article",
      url: canonical,
      publishedTime: article.publishedAt?.toISOString(),
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PublicHelpArticlePage({ params }: Props) {
  const { orgId, slug } = await params;
  const article = await getPublicKbArticleMeta(orgId, slug);

  const jsonLd = article
    ? {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: article.title,
        description: article.seoDescription || article.excerpt || undefined,
        datePublished: article.publishedAt?.toISOString(),
        dateModified: article.updatedAt?.toISOString(),
        keywords: article.tags?.length ? article.tags.join(", ") : undefined,
        author: { "@type": "Organization", name: BRAND_NAME },
        publisher: { "@type": "Organization", name: BRAND_NAME, url: BRAND_URL },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": `${BRAND_URL}/help/${orgId}/${slug}`,
        },
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ArticleReader orgId={orgId} slug={slug} />
    </>
  );
}
