import type { Metadata } from "next";
import { Listing } from "@/features/blog/listing";
import { listPosts } from "@/lib/blog/api";
import { LISTING_PAGE_SIZE, assertPageExists, listingPageNumber, pagedPath } from "@/lib/blog/listing-route";
import { JOURNAL_NAME, blogUrl } from "@/lib/blog/seo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ page?: string[] }> };
const BASE = "/blogs/archive";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { page } = await params;
  const n = page?.length === 2 && /^\d+$/.test(page[1] ?? "") ? Number(page[1]) : 1;
  return {
    title: { absolute: `All stories${n > 1 ? ` — page ${n}` : ""} · ${JOURNAL_NAME}` },
    description: "Every story published in the journal, newest first.",
    alternates: { canonical: blogUrl(pagedPath("/archive", n)) },
  };
}

export default async function ArchivePage({ params }: Props) {
  const { page: segments } = await params;
  const page = listingPageNumber(segments, BASE);
  const result = await listPosts({ page, limit: LISTING_PAGE_SIZE });
  assertPageExists(result);
  return (
    <Listing eyebrow="The archive" title="All stories" intro="Everything we have published, newest first." basePath={BASE} page={result}
      crumbs={[{ href: "/blogs", label: "Journal" }, { href: BASE, label: "All stories" }]} empty="No stories have been published yet." />
  );
}
