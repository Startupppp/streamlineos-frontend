"use client";

/**
 * The journal could not reach its content service. Recoverable by design: this is never presented
 * as "no articles" or "not found", because neither is true.
 */
export default function JournalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto flex max-w-xl flex-col items-center px-4 py-32 text-center">
      <h1 className="font-journal text-4xl text-journal-ink">The journal is briefly unavailable</h1>
      <p className="mt-4 text-journal-muted">We could not load this page just now. Nothing has been removed; please try again in a moment.</p>
      <button type="button" onClick={reset} className="mt-8 min-h-11 rounded-full bg-journal-ink px-5 text-journal-paper">Try again</button>
    </div>
  );
}
