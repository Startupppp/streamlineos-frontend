"use client";

import DOMPurify from "isomorphic-dompurify";

interface PublicArticleBodyProps {
  html: string;
}

const PROSE_CLASS =
  "prose prose-slate dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-img:rounded-lg prose-img:border prose-img:border-border";

export function PublicArticleBody({ html }: PublicArticleBodyProps) {
  return (
    <div
      className={PROSE_CLASS}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
    />
  );
}
