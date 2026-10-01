import Link from "next/link";

/** Real links, so every page of a listing is reachable without JavaScript. Page 1 is the root URL. */
export function Pagination({ basePath, page, totalPages }: { basePath: string; page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  const href = (n: number) => (n === 1 ? basePath : `${basePath}/page/${n}`);
  const window = [...new Set([1, page - 1, page, page + 1, totalPages])].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  return (
    <nav aria-label="Pagination" className="mt-16 flex flex-wrap items-center justify-center gap-2 border-t border-journal-rule pt-8 text-sm">
      {page > 1 ? <Link href={href(page - 1)} rel="prev" className="min-h-11 px-3 py-3 text-journal-ink underline-offset-4 hover:underline">← Newer</Link> : null}
      {window.map((n, i) => (
        <span key={n} className="flex items-center gap-2">
          {i > 0 && n - (window[i - 1] ?? n) > 1 ? <span aria-hidden className="text-journal-muted">…</span> : null}
          {n === page ? (
            <span aria-current="page" className="flex size-11 items-center justify-center rounded-full bg-journal-ink text-journal-paper">{n}</span>
          ) : (
            <Link href={href(n)} className="flex size-11 items-center justify-center rounded-full text-journal-ink hover:bg-journal-sage">{n}</Link>
          )}
        </span>
      ))}
      {page < totalPages ? <Link href={href(page + 1)} rel="next" className="min-h-11 px-3 py-3 text-journal-ink underline-offset-4 hover:underline">Older →</Link> : null}
    </nav>
  );
}

