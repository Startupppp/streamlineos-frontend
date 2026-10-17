import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Listing } from "@/features/blog/listing";
import { getCategory, listPosts } from "@/lib/blog/api";
import { LISTING_PAGE_SIZE, assertPageExists, listingPageNumber, pagedPath } from "@/lib/blog/listing-route";
import { JOURNAL_NAME, blogUrl } from "@/lib/blog/seo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ categorySlug: string; page?: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categorySlug, page } = await params;
  const category = await getCategory(categorySlug);
  if (!category) return { title: "Topic not found", robots: { index: false } };
  const n = page?.length === 2 && /^\d+$/.test(page[1] ?? "") ? Number(page[1]) : 1;
  return {
    title: { absolute: `${category.seoTitle ?? category.name}${n > 1 ? ` — page ${n}` : ""} · ${JOURNAL_NAME}` },
    description: category.seoDescription ?? category.description ?? `Stories about ${category.name} from the journal.`,
    alternates: { canonical: blogUrl(pagedPath(`/category/${category.slug}`, n)) },
    // An empty topic is not a page worth indexing.
    robots: category.count === 0 ? { index: false, follow: true } : undefined,
  };
}

export default async function CategoryPage({ params }: Props) {
  const { categorySlug, page: segments } = await params;
  const category = await getCategory(categorySlug);
  if (!category) notFound();
  const base = `/blogs/category/${category.slug}`;
  const page = listingPageNumber(segments, base);
  const result = await listPosts({ page, limit: LISTING_PAGE_SIZE, category: category.slug });
  assertPageExists(result);
  return (
    <Listing eyebrow="Topic" title={category.name} intro={category.description} basePath={base} page={result}
      crumbs={[{ href: "/blogs", label: "Journal" }, { href: base, label: category.name }]} empty="No stories in this topic yet." />
  );
}
