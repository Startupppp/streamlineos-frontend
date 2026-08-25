import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publicGet, type PublicKbArticle } from "@/lib/public-fetch";
import { PublicArticleContent } from "@/features/help-centre/components/public-article-content";

export const revalidate = 60;

type Props = { params: Promise<{ orgId: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgId, slug } = await params;
  const article = await publicGet<PublicKbArticle>(`/public/kb/${slug}`, { org: orgId });
  if (!article) return { title: "Article not found" };
  const title = article.seoTitle ?? article.title;
  const description = article.seoDescription ?? article.excerpt ?? undefined;
  return {
    title,
    description,
    alternates: { canonical: `/help/${orgId}/${slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      url: `/help/${orgId}/${slug}`,
      ...(article.publishedAt ? { publishedTime: article.publishedAt } : {}),
    },
    twitter: { card: "summary", title, description },
  };
}

export default async function PublicHelpArticlePage({ params }: Props) {
  const { orgId, slug } = await params;
  const article = await publicGet<PublicKbArticle>(`/public/kb/${slug}`, { org: orgId });
  if (!article) return notFound();
  return <PublicArticleContent article={article} orgId={orgId} />;
}
