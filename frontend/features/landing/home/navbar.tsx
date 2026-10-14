"use client";

import { useState, type FocusEvent, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Menu, X } from "lucide-react";
import { AnimatedLogo } from "@/components/brand/animated-logo";
import { BRAND_NAME } from "@/lib/branding";
import { EASE_OUT } from "../components/motion/variants";
import { ProductMenu } from "./product-menu";
import { StartLink } from "./section";

// "Product" is the menu on desktop; this list is the plain-link version for the
// mobile sheet and the desktop links after it.
const LINKS = [
  { label: "Product", href: "/#apps" },
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/#faq" },
  { label: "Blog", href: "/blogs" },
];

const DESKTOP_LINKS = LINKS.slice(1);

/** The soft pill that glides between navbar items as the pointer or focus moves. */
function HoverPill() {
  return (
    <motion.span
      layoutId="lp-nav-pill"
      aria-hidden
      className="absolute inset-0 rounded-full bg-(--lp-accent-soft)"
      transition={{ type: "spring", stiffness: 520, damping: 40, mass: 0.6 }}
    />
  );
}

/** A floating bar that turns solid once the page scrolls under it. */
export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  // The pill rests on the current page and follows the pointer when it moves.
  const pathname = usePathname();
  const current = DESKTOP_LINKS.find((link) => link.href === pathname)?.label ?? null;
  const pill = hovered ?? current;
  const { scrollY } = useScroll();

  function handleScroll(y: number) {
    setScrolled(y > 24);
  }

  useMotionValueEvent(scrollY, "change", handleScroll);

  function handleToggle() {
    setOpen((value) => !value);
  }

  function handleClose() {
    setOpen(false);
  }

  function handleItemEnter(event: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>) {
    setHovered(event.currentTarget.dataset.label ?? null);
  }

  function handleNavLeave() {
    setHovered(null);
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
      <div
        className={`mx-auto flex h-14 max-w-6xl items-center justify-between gap-6 rounded-full border px-3 pl-4 transition-[background-color,border-color,box-shadow] duration-300 ${
          scrolled || open ? "lp-bar" : "border-transparent bg-transparent"
        }`}
      >
        <Link href="/" className="flex items-center gap-2.5" aria-label={`${BRAND_NAME} home`}>
          <AnimatedLogo size={28} className="rounded-lg" />
          <span className="text-sm font-semibold tracking-tight text-foreground">{BRAND_NAME}</span>
        </Link>

        <nav
          aria-label="Primary"
          onMouseLeave={handleNavLeave}
          onBlur={handleNavLeave}
          className="hidden items-center gap-1 md:flex"
        >
          <div data-label="Product" onMouseEnter={handleItemEnter} onFocus={handleItemEnter} className="relative">
            {pill === "Product" ? <HoverPill /> : null}
            <ProductMenu />
          </div>
          {DESKTOP_LINKS.map((link) => (
            <div
              key={link.label}
              data-label={link.label}
              onMouseEnter={handleItemEnter}
              onFocus={handleItemEnter}
              className="relative"
            >
              {pill === link.label ? <HoverPill /> : null}
              <Link
                href={link.href}
                aria-current={link.label === current ? "page" : undefined}
                className="relative z-10 block rounded-full px-3 py-1.5 text-sm text-(--lp-ink)/70 transition-colors duration-200 hover:text-foreground aria-[current=page]:text-foreground"
              >
                {link.label}
              </Link>
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/signin"
            className="hidden h-9 items-center rounded-full px-3 text-sm text-(--lp-ink)/80 transition-colors hover:text-foreground sm:inline-flex"
          >
            Sign in
          </Link>
          <StartLink size="sm" />
          <button
            type="button"
            onClick={handleToggle}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="lp-menu"
            className="inline-flex size-9 items-center justify-center rounded-full bg-(--lp-surface) text-foreground md:hidden"
          >
            {open ? <X className="size-4" aria-hidden /> : <Menu className="size-4" aria-hidden />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.nav
            id="lp-menu"
            aria-label="Primary"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className="lp-glass mx-auto mt-2 flex max-w-6xl flex-col gap-1 rounded-3xl p-3 md:hidden"
          >
            {[...LINKS, { label: "Sign in", href: "/signin" }].map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={handleClose}
                className="rounded-2xl px-3 py-2.5 text-sm text-foreground hover:bg-(--lp-mist)"
              >
                {link.label}
              </Link>
            ))}
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
