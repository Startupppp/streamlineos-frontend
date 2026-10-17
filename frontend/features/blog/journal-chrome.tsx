import Link from "next/link";
import { BRAND_NAME } from "@/lib/branding";
import { MobileNav } from "./mobile-nav";

const NAV = [
  { href: "/blogs", label: "Journal" },
  { href: "/blogs#topics", label: "Topics" },
  { href: "/blogs/archive", label: "All stories" },
  { href: "/blogs/editorial-policy", label: "Our editorial process" },
  { href: "/blogs/search", label: "Search" },
];
const PRODUCT_CTA = { href: "/pricing", label: `Explore ${BRAND_NAME}` };

export function JournalHeader() {
  return (
    <header className="relative border-b border-journal-rule bg-journal-paper">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-4 sm:px-6">
        <Link href="/blogs" className="flex min-h-11 items-baseline gap-2 text-journal-ink">
          <span className="font-semibold tracking-tight">{BRAND_NAME}</span>
          <span className="font-journal text-lg italic">Journal</span>
        </Link>
        <nav aria-label="Journal" className="ml-auto hidden items-center gap-1 text-sm md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-full px-3 py-2 text-journal-muted hover:bg-journal-sage hover:text-journal-ink">{n.label}</Link>
          ))}
          <Link href={PRODUCT_CTA.href} className="ml-2 rounded-full bg-journal-ink px-4 py-2 text-journal-paper hover:opacity-90">{PRODUCT_CTA.label}</Link>
        </nav>
        <div className="ml-auto md:hidden">
          <MobileNav links={NAV} cta={PRODUCT_CTA} />
        </div>
      </div>
      <div className="border-t border-journal-rule">
        <p className="mx-auto max-w-7xl px-4 py-2 text-xs uppercase tracking-widest text-journal-muted sm:px-6">
          <span className="font-semibold text-journal-ink">The {BRAND_NAME} Journal</span>
          <span aria-hidden> — </span>
          Practical writing on people, projects, customers and the work between them.
        </p>
      </div>
    </header>
  );
}

export function JournalFooter() {
  const year = new Date().getUTCFullYear();
  return (
    <footer className="mt-24 border-t border-journal-rule bg-journal-paper">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-journal text-2xl text-journal-ink">The {BRAND_NAME} Journal</p>
          <p className="mt-3 max-w-md text-sm text-journal-muted">Guides for the people, projects and processes that keep a business moving, written and checked by the {BRAND_NAME} team.</p>
        </div>
        <nav aria-label="Journal links" className="text-sm">
          <p className="font-semibold text-journal-ink">Journal</p>
          <ul className="mt-3 space-y-2 text-journal-muted">
            <li><Link href="/blogs/archive" className="hover:text-journal-ink">All stories</Link></li>
            <li><Link href="/blogs/editorial-policy" className="hover:text-journal-ink">Editorial policy and corrections</Link></li>
            <li><a href="/blogs/rss.xml" className="hover:text-journal-ink">RSS feed</a></li>
          </ul>
        </nav>
        <nav aria-label={`${BRAND_NAME} links`} className="text-sm">
          <p className="font-semibold text-journal-ink">{BRAND_NAME}</p>
          <ul className="mt-3 space-y-2 text-journal-muted">
            <li><Link href="/" className="hover:text-journal-ink">Product</Link></li>
            <li><Link href="/pricing" className="hover:text-journal-ink">Pricing</Link></li>
            <li><Link href="/contact" className="hover:text-journal-ink">Contact</Link></li>
            <li><Link href="/legal/privacy" className="hover:text-journal-ink">Privacy</Link></li>
            <li><Link href="/legal/terms" className="hover:text-journal-ink">Terms</Link></li>
          </ul>
        </nav>
      </div>
      <p className="border-t border-journal-rule px-4 py-6 text-center text-xs text-journal-muted">© {year} {BRAND_NAME}</p>
    </footer>
  );
}
