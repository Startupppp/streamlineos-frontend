import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Listing } from "@/features/blog/listing";
import { isSlug, listPosts } from "@/lib/blog/api";
import { LISTING_PAGE_SIZE, assertPageExists, listingPageNumber, pagedPath } from "@/lib/blog/listing-route";
import { JOURNAL_NAME, blogUrl } from "@/lib/blog/seo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ tag: string; page?: string[] }> };

/** Tag archives are for readers, not search engines: noindex by default, links still followed. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag, page } = await params;
  const n = page?.length === 2 && /^\d+$/.test(page[1] ?? "") ? Number(page[1]) : 1;
  return {
    title: { absolute: `#${tag}${n > 1 ? ` — page ${n}` : ""} · ${JOURNAL_NAME}` },
    alternates: { canonical: blogUrl(pagedPath(`/tag/${tag}`, n)) },
    robots: { index: false, follow: true },
  };
}

export default async function TagPage({ params }: Props) {
  const { tag, page: segments } = await params;
  if (!isSlug(tag, 64)) notFound();
  const base = `/blogs/tag/${tag}`;
  const page = listingPageNumber(segments, base);
  const result = await listPosts({ page, limit: LISTING_PAGE_SIZE, tag });
  if (result.total === 0) notFound();
  assertPageExists(result);
  return (
    <Listing eyebrow="Tag" title={`#${tag}`} basePath={base} page={result}
      crumbs={[{ href: "/blogs", label: "Journal" }, { href: base, label: `#${tag}` }]} empty="No stories with this tag." />
  );
}
