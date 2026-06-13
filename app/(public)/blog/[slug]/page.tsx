import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { MarketingShell } from "@/features/marketing/marketing-shell";
import { BRAND_NAME, BRAND_URL } from "@/lib/branding";
import { getAllPosts, getPostBySlug } from "@/features/blog/data/posts";
import {
  BlogPostingJsonLd,
  BreadcrumbJsonLd,
} from "@/features/seo/structured-data";

type Params = { slug: string };

export async function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  const url = `${BRAND_URL}/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      url,
      siteName: BRAND_NAME,
      publishedTime: post.publishedAt,
      authors: [post.author.name],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
    },
  };
}

function renderMarkdown(md: string) {
  const blocks = md.trim().split(/\n\n+/);
  return blocks.map((block, i) => {
    if (block.startsWith("## ")) {
      return (
        <h2
          key={i}
          className="font-display text-2xl lg:text-3xl font-bold text-slate-900 mt-12 mb-4 tracking-[-0.02em]"
        >
          {block.replace(/^##\s+/, "")}
        </h2>
      );
    }
    if (block.startsWith("- ") || block.startsWith("**")) {
      const items = block.split(/\n(?=- |\*\*)/);
      const isList = items[0].startsWith("- ");
      if (isList) {
        return (
          <ul key={i} className="list-disc pl-6 space-y-2 text-slate-700 my-5 leading-relaxed">
            {items.map((line, j) => (
              <li key={j} dangerouslySetInnerHTML={{ __html: inlineMd(line.replace(/^-\s+/, "")) }} />
            ))}
          </ul>
        );
      }
    }
    return (
      <p
        key={i}
        className="text-[16px] text-slate-700 leading-[1.8] my-5"
        dangerouslySetInnerHTML={{ __html: inlineMd(block) }}
      />
    );
  });
}

function inlineMd(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "<strong class='text-slate-900 font-semibold'>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      "<a href='$2' class='text-blue-600 hover:underline'>$1</a>",
    )
    .replace(/`([^`]+)`/g, "<code class='px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[0.92em]'>$1</code>");
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const url = `${BRAND_URL}/blog/${post.slug}`;
  const publishedDate = new Date(post.publishedAt).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <BlogPostingJsonLd
        title={post.title}
        description={post.excerpt}
        url={url}
        datePublished={post.publishedAt}
        authorName={post.author.name}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: BRAND_URL },
          { name: "Blog", url: `${BRAND_URL}/blog` },
          { name: post.title, url },
        ]}
      />

      <MarketingShell>
        <article className="container mx-auto px-4 lg:px-8 max-w-3xl">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-blue-600 transition-colors mb-8"
          >
            <ArrowLeft className="h-3 w-3" />
            All posts
          </Link>

          <header className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <span className="text-[12px] font-medium px-2.5 py-1 rounded-md bg-blue-50 border border-blue-100 text-blue-700">
                {post.tag}
              </span>
              <span className="text-[13px] font-medium text-slate-400">
                {publishedDate} · {post.readingMinutes} min read
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em] leading-[1.05] text-slate-900 mb-5">
              {post.title}
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed">{post.excerpt}</p>
            <div className="mt-7 flex items-center gap-3 pt-6 border-t border-slate-200">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 inline-flex items-center justify-center text-white text-sm font-bold">
                {post.author.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="text-sm">
                <div className="font-semibold text-slate-900">{post.author.name}</div>
                <div className="text-[12px] text-slate-500">{post.author.role}</div>
              </div>
            </div>
          </header>

          <div className="prose-blog">{renderMarkdown(post.content)}</div>

          <footer className="mt-16 pt-8 border-t border-slate-200">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 h-11 px-5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
            >
              Get in touch
              <ArrowRight className="h-4 w-4" />
            </Link>
          </footer>
        </article>
      </MarketingShell>
    </>
  );
}
