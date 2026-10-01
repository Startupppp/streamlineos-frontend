import type { Metadata } from "next";
import { JournalFooter, JournalHeader } from "@/features/blog/journal-chrome";
import { JOURNAL_FONT_CLASS } from "@/lib/blog/journal-font";
import { JOURNAL_NAME } from "@/lib/blog/seo";

export const metadata: Metadata = {
  alternates: { types: { "application/rss+xml": [{ url: "/blogs/rss.xml", title: JOURNAL_NAME }] } },
};

export default function JournalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${JOURNAL_FONT_CLASS} flex min-h-dvh flex-col bg-journal-paper text-journal-ink`}>
      <a href="#journal-main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-journal-surface focus:px-4 focus:py-2">
        Skip to content
      </a>
      <JournalHeader />
      <main id="journal-main" className="flex-1">{children}</main>
      <JournalFooter />
    </div>
  );
}
