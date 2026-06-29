export const dynamic = "force-dynamic";

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
<<<<<<< Updated upstream
  await params;
=======
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const { html, toc } = extractToc(post.content);
  const [related, adjacent] = await Promise.all([
    getRelatedPosts({ postId: post.id, categoryId: post.categoryId, limit: 3 }),
    getAdjacentPosts(post.publishedAt ?? null),
  ]);

  const cover = resolveImageUrl(post.coverImage);
  const postUrl = `/blogs/${post.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: cover ? [cover] : undefined,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt?.toISOString(),
    author: post.author?.name
      ? { "@type": "Person", name: post.author.name }
      : undefined,
    publisher: {
      "@type": "Organization",
      name: BRAND_NAME,
      url: BRAND_URL,
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${BRAND_URL}${postUrl}` },
  };

>>>>>>> Stashed changes
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="text-muted-foreground">Blog post content unavailable.</p>
    </div>
  );
}
