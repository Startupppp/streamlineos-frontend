import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Listing } from "@/features/blog/listing";
import { getAuthor, listPosts } from "@/lib/blog/api";
import { LISTING_PAGE_SIZE, assertPageExists, listingPageNumber, pagedPath } from "@/lib/blog/listing-route";
import { JOURNAL_NAME, blogUrl, jsonLd } from "@/lib/blog/seo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ authorSlug: string; page?: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { authorSlug, page } = await params;
  const author = await getAuthor(authorSlug);
  if (!author) return { title: "Author not found", robots: { index: false } };
  const n = page?.length === 2 && /^\d+$/.test(page[1] ?? "") ? Number(page[1]) : 1;
  return {
    title: { absolute: `${author.name}${n > 1 ? ` — page ${n}` : ""} · ${JOURNAL_NAME}` },
    description: author.bio?.slice(0, 160) ?? `Stories by ${author.name}.`,
    alternates: { canonical: blogUrl(pagedPath(`/author/${author.slug}`, n)) },
  };
}

export default async function AuthorPage({ params }: Props) {
  const { authorSlug, page: segments } = await params;
  const author = await getAuthor(authorSlug);
  if (!author) notFound();
  const base = `/blogs/author/${author.slug}`;
  const page = listingPageNumber(segments, base);
  const result = await listPosts({ page, limit: LISTING_PAGE_SIZE, author: author.slug });
  assertPageExists(result);
  const person = { "@context": "https://schema.org", "@type": "Person", name: author.name, url: blogUrl(`/author/${author.slug}`), ...(author.role ? { jobTitle: author.role } : {}) };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(person) }} />
      <Listing eyebrow={author.role ?? "Author"} title={author.name} intro={author.bio} basePath={base} page={result}
        crumbs={[{ href: "/blogs", label: "Journal" }, { href: base, label: author.name }]} empty="No stories by this author yet."
        aside={author.avatar ? <img src={author.avatar} alt="" width={96} height={96} className="mt-6 size-24 rounded-full object-cover" /> : null} />
    </>
  );
}
