"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Magnetic } from "./motion/magnetic";
import { AnimatedLogo } from "./animated-logo";
import { BRAND_NAME } from "@/lib/branding";

const navLinks = [
  { label: "Apps", href: "#apps" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      if (mq.matches) setOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-[padding] duration-500 ${
        scrolled ? "py-2" : "py-3 sm:py-4"
      }`}
    >
      <div
        className={`container mx-auto px-3 sm:px-4 lg:px-8 transition-[max-width] duration-500 ${
          scrolled ? "max-w-5xl" : "max-w-7xl"
        }`}
      >
        <div
          className={`flex items-center justify-between gap-2 rounded-2xl transition-all duration-500 ${
            scrolled
              ? "bg-white/90 backdrop-blur-xl px-3 sm:px-4 py-2 border border-brand-core/10 shadow-[0_12px_40px_-18px_rgba(30,64,175,0.28)]"
              : "px-1.5 sm:px-2 py-1 border border-transparent"
          }`}
        >
          <Link
            href="/"
            className="flex items-center gap-2 sm:gap-2.5 group min-w-0 shrink"
            aria-label={BRAND_NAME}
          >
            <div className="relative shrink-0">
              <AnimatedLogo
                size={32}
                className="rounded-lg ring-1 ring-brand-core/10 sm:hidden"
              />
              <AnimatedLogo
                size={34}
                className="rounded-lg ring-1 ring-brand-core/10 hidden sm:block"
              />
              <div className="absolute inset-0 rounded-lg bg-brand-core/0 group-hover:bg-brand-core/10 transition-colors duration-300 pointer-events-none" />
            </div>
            <span className="font-display text-sm sm:text-base font-bold tracking-tight text-slate-900 truncate">
              {BRAND_NAME}
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-5 lg:gap-7">
            {navLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="text-label font-medium text-slate-600 hover:text-slate-900 transition-colors duration-200"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Magnetic strength={reduce ? 0 : 0.28}>
              <Link href="/signin">
                <Button size="sm" className="h-9 px-3 sm:px-4 text-xs sm:text-sm">
                  Get started
                  <ArrowRight className="ml-1 sm:ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            </Magnetic>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="md:hidden h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white/90 text-slate-900"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="md:hidden mt-2 rounded-2xl glass-panel-strong p-3 space-y-1 max-h-[min(70vh,480px)] overflow-y-auto"
            >
              {navLinks.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block px-3 py-3 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                >
                  {l.label}
                </a>
              ))}
              <Link
                href="/signin"
                onClick={() => setOpen(false)}
                className="mt-1 flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Get started
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
