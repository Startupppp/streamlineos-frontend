"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Magnetic } from "./motion/magnetic";
import { AnimatedLogo } from "./animated-logo";
import { BRAND_NAME } from "@/lib/branding";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Modules", href: "#modules" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled ? "py-2" : "py-4"
      }`}
    >
      <div
        className={`container mx-auto px-4 lg:px-8 transition-all duration-500 ${
          scrolled ? "max-w-5xl" : "max-w-7xl"
        }`}
      >
        <div
          className={`flex items-center justify-between rounded-2xl transition-all duration-500 ${
            scrolled
              ? "bg-white px-4 py-2 border border-blue-500/10"
              : "px-2 py-1 border border-transparent"
          }`}
        >
          <Link
            href="/"
            className="flex items-center gap-2.5 group"
            aria-label={BRAND_NAME}
          >
            <div className="relative">
              <AnimatedLogo
                size={34}
                className="rounded-lg ring-1 ring-blue-500/10"
              />
              <div className="absolute inset-0 rounded-lg bg-blue-500/0 group-hover:bg-blue-500/10 transition-colors duration-300 pointer-events-none" />
            </div>
            <span className="font-display text-base font-bold tracking-tight text-slate-900">
              {BRAND_NAME}
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-7">
            {navLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="text-[13px] font-medium text-slate-600 hover:text-slate-900 transition-colors duration-200"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/signin" className="hidden sm:inline-flex">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-0"
              >
                Sign in
              </Button>
            </Link>
            <Magnetic strength={0.3}>
              <Link href="/signin">
                <Button size="sm" className="h-9 px-4">
                  Get started
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            </Magnetic>
            <button
              onClick={() => setOpen((v) => !v)}
              className="md:hidden h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-900"
              aria-label="Toggle menu"
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="md:hidden mt-2 rounded-2xl glass-panel-strong p-3 space-y-1"
            >
              {navLinks.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2.5 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                >
                  {l.label}
                </a>
              ))}
              <Link
                href="/signin"
                onClick={() => setOpen(false)}
                className="block px-3 py-2.5 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
              >
                Sign in
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
