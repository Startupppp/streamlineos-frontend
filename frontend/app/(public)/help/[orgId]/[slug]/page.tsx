import type { Metadata } from "next";
import { ArticleReader } from "@/features/kb/components/article-reader";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ orgId: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgId, slug } = await params;
  return {
    title: "Help Article",
    alternates: { canonical: `/help/${orgId}/${slug}` },
  };
}

export default async function PublicHelpArticlePage({ params }: Props) {
  const { orgId, slug } = await params;
  return <ArticleReader orgId={orgId} slug={slug} />;
}
