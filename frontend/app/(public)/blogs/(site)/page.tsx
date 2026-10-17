import type { Metadata } from "next";
import { JournalHero } from "@/features/blog/home/hero";
import { EditorialFeature, LatestStories, ProductCta, Topics, TrustSection } from "@/features/blog/home/sections";
import { getCategories, listPosts } from "@/lib/blog/api";
import { JOURNAL_NAME, blogUrl } from "@/lib/blog/seo";

export const dynamic = "force-dynamic";

const DESCRIPTION = "Practical guides for the people, projects, and processes that keep your business moving.";

export const metadata: Metadata = {
  title: { absolute: JOURNAL_NAME },
  description: DESCRIPTION,
  alternates: { canonical: blogUrl() },
  openGraph: { type: "website", url: blogUrl(), title: JOURNAL_NAME, description: DESCRIPTION },
};

export default async function JournalHomePage() {
  const [featured, latest, categories] = await Promise.all([
    listPosts({ featured: true, limit: 2 }),
    listPosts({ limit: 7 }),
    getCategories(),
  ]);
  // Featured is chosen in the CMS; with none, the newest story leads. It never repeats below.
  const hero = featured.posts[0] ?? latest.posts[0] ?? null;
  const feature = featured.posts.find((p) => p.id !== hero?.id) ?? null;
  const grid = latest.posts.filter((p) => p.id !== hero?.id && p.id !== feature?.id).slice(0, 6);

  return (
    <>
      <JournalHero featured={hero} />
      <LatestStories posts={grid} />
      <Topics categories={categories} />
      {feature ? <EditorialFeature post={feature} /> : null}
      <TrustSection />
      <ProductCta />
    </>
  );
}
