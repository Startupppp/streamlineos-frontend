"use client";

import { useMemo } from "react";
import DOMPurify from "isomorphic-dompurify";
import { extractToc } from "@/lib/blog-utils";

interface Heading {
  id: string;
  text: string;
  level: number;
}

interface PreparedArticle {
  html: string;
  headings: Heading[];
}

export function prepareArticle(content: string): PreparedArticle {
  const { html, toc } = extractToc(content);
  return {
    html,
    headings: toc.map((item) => ({ id: item.id, text: item.text, level: item.level })),
  };
}

export function ArticleContent({ content }: { content: string }) {
  const { html } = useMemo(() => {
    const prepared = prepareArticle(content);
    return { ...prepared, html: DOMPurify.sanitize(prepared.html) };
  }, [content]);

  return (
    <div
      className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-img:rounded-lg prose-img:border prose-img:border-border"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
