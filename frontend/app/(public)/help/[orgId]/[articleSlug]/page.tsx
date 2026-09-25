import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publicGet, type PublicKbArticle, type PublicOrgInfo } from "@/lib/public-fetch";
import { publicKbArticleContract, publicOrgNameContract } from "@/lib/public-schema";

import { PublicArticleContent } from "@/features/help-centre/components/public-article-content";

export const revalidate = 60;

type Props = { params: Promise<{ orgId: string; articleSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgId, articleSlug } = await params;
  const article = await publicGet<PublicKbArticle>(
    `/public/kb/${articleSlug}`,
    { org: orgId },
    publicKbArticleContract,
  );
  if (!article) return { title: "Article not found" };
  const title = article.seoTitle ?? article.title;
  const description = article.seoDescription ?? article.excerpt ?? undefined;
  return {
    title,
    description,
    alternates: { canonical: `/help/${orgId}/${articleSlug}` },
    openGraph: {
      title,
      description,
      type: "article",
      url: `/help/${orgId}/${articleSlug}`,
      ...(article.publishedAt ? { publishedTime: article.publishedAt } : {}),
    },
    twitter: { card: "summary", title, description },
  };
}

export default async function PublicHelpArticlePage({ params }: Props) {
  const { orgId, articleSlug } = await params;
  const [article, org] = await Promise.all([
    publicGet<PublicKbArticle>(
      `/public/kb/${articleSlug}`,
      { org: orgId },
      publicKbArticleContract,
    ),
    publicGet<PublicOrgInfo>(`/public/org/${orgId}`, undefined, publicOrgNameContract),
  ]);
  if (!article) return notFound();
  return <PublicArticleContent article={article} orgId={orgId} org={org} />;
}
