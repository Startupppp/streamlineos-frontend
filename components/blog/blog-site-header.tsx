import Link from "next/link";
import { BRAND_NAME } from "@/lib/branding";
import { PenLine } from "lucide-react";

/** Lightweight top bar for the public blog. */
export function BlogSiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/blogs" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <PenLine className="size-4" />
          </span>
          <span>
            {BRAND_NAME} <span className="text-muted-foreground">Blog</span>
          </span>
        </Link>

        <nav className="flex items-center gap-5 text-sm text-muted-foreground">
          <Link href="/blogs" className="transition-colors hover:text-foreground">
            Articles
          </Link>
          <Link href="/" className="transition-colors hover:text-foreground">
            Back to site
          </Link>
        </nav>
      </div>
    </header>
  );
}
