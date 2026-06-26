import Link from "next/link";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/branding";

export function BlogFooter() {
  return (
    <footer className="mt-20 border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <div>
          <p className="font-semibold text-foreground">{BRAND_NAME} Blog</p>
          <p>{BRAND_TAGLINE}</p>
        </div>
        <nav className="flex items-center gap-5">
          <Link href="/blogs" className="transition-colors hover:text-foreground">
            Articles
          </Link>
          <Link href="/" className="transition-colors hover:text-foreground">
            Home
          </Link>
        </nav>
      </div>
    </footer>
  );
}
