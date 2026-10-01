import type { TocEntry } from "@/lib/blog/toc";

/**
 * Plain anchor links, so the contents work without JavaScript. On small screens it is a
 * collapsible <details>; on wide screens the same list sits beside the article.
 */
export function TableOfContents({ entries, variant }: { entries: TocEntry[]; variant: "mobile" | "desktop" }) {
  const list = (
    <ol className="space-y-2 text-sm">
      {entries.map((e) => (
        <li key={e.id} className={e.level === 3 ? "pl-4" : ""}>
          <a href={`#${e.id}`} className="text-journal-muted underline-offset-4 hover:text-journal-ink hover:underline">{e.text}</a>
        </li>
      ))}
    </ol>
  );
  if (variant === "mobile") {
    return (
      <details className="rounded-sm border border-journal-rule bg-journal-surface p-4 lg:hidden">
        <summary className="min-h-11 cursor-pointer py-2 font-semibold text-journal-ink">In this article</summary>
        <nav aria-label="Table of contents (mobile)" className="mt-3">{list}</nav>
      </details>
    );
  }
  return (
    <nav aria-label="Table of contents" className="sticky top-8 hidden lg:block">
      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-journal-accent-ink">In this article</p>
      {list}
    </nav>
  );
}
