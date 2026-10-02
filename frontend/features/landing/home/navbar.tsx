"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedLogo } from "@/components/brand/animated-logo";
import { BRAND_NAME } from "@/lib/branding";
import { CONTAINER } from "./section";

const LINKS = [
  { label: "Product", href: "#apps" },
  { label: "Solutions", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Resources", href: "/blogs" },
];

const LINK_CLASS = "text-sm text-muted-foreground transition-colors hover:text-foreground";

export function Navbar() {
  const [open, setOpen] = useState(false);

  function handleToggle() {
    setOpen((value) => !value);
  }

  function handleClose() {
    setOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-(--lp-canvas)/80 backdrop-blur-xl">
      <div className={`${CONTAINER} flex h-16 items-center justify-between gap-6`}>
        <Link href="/" className="flex items-center gap-2.5" aria-label={`${BRAND_NAME} home`}>
          <AnimatedLogo size={28} className="rounded-lg" />
          <span className="text-[0.95rem] font-semibold tracking-tight text-foreground">
            {BRAND_NAME}
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <Link key={link.label} href={link.href} className={LINK_CLASS}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Button asChild size="sm" className="rounded-lg">
            <Link href="/signin">Sign in</Link>
          </Button>
          <button
            type="button"
            onClick={handleToggle}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="lp-menu"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-card text-foreground md:hidden"
          >
            {open ? <X className="size-4" aria-hidden /> : <Menu className="size-4" aria-hidden />}
          </button>
        </div>
      </div>

      {open ? (
        <nav
          id="lp-menu"
          aria-label="Primary"
          className={`${CONTAINER} flex flex-col gap-1 border-t border-border/50 py-3 md:hidden`}
        >
          {LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={handleClose}
              className="rounded-lg px-2 py-2.5 text-sm text-foreground hover:bg-muted"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
