import Link from "next/link";

export default function JournalNotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-32 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-journal-accent-ink">404</p>
      <h1 className="mt-3 font-journal text-4xl text-journal-ink">This story isn’t here</h1>
      <p className="mt-4 text-journal-muted">It may have moved, been retired, or never existed. The archive lists everything we have published.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/blogs/archive" className="rounded-full bg-journal-ink px-5 py-3 text-journal-paper">Browse the archive</Link>
        <Link href="/blogs/search" className="rounded-full border border-journal-rule px-5 py-3 text-journal-ink">Search the journal</Link>
      </div>
    </div>
  );
}
