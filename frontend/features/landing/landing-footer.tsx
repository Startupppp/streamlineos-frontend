"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AnimatedLogo } from "./components/animated-logo";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/branding";
import { MotionItem, MotionReveal, MotionStagger } from "./components/motion/motion-reveal";
import { EASE_OUT } from "./components/motion/variants";

const footerCols = [
  {
    title: "Product",
    links: [
      { label: "Apps", href: "#apps" },
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blogs" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/legal/privacy" },
      { label: "Terms", href: "/legal/terms" },
      { label: "Security", href: "/legal/security" },
    ],
  },
];

export function LandingFooter() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-5% 0px" }}
      transition={{ duration: 0.6, ease: EASE_OUT }}
      className="relative border-t border-slate-200/80 bg-white/70 backdrop-blur-sm"
    >
      <div className="container mx-auto px-4 lg:px-8">
        <MotionStagger className="grid grid-cols-2 md:grid-cols-5 gap-8 py-12">
          <MotionItem className="col-span-2 max-w-xs">
            <Link
              href="/"
              className="flex items-center gap-2.5 mb-4 group"
              aria-label={BRAND_NAME}
            >
              <AnimatedLogo size={36} className="rounded-xl" />
              <span className="font-display text-lg font-bold tracking-tight text-slate-900">
                {BRAND_NAME}
              </span>
            </Link>
            <p className="text-sm text-slate-500 leading-relaxed mb-5">
              {BRAND_TAGLINE}.
            </p>
            <div className="flex items-center gap-2">
              <SocialLink
                href="https://www.linkedin.com/company/streamline-os"
                label="LinkedIn"
                d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
              />
            </div>
          </MotionItem>

          {footerCols.map((col) => (
            <MotionItem key={col.title}>
              <h4 className="text-[11px] font-semibold text-slate-500 mb-4">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-600 hover:text-blue-600 transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </MotionItem>
          ))}
        </MotionStagger>

        <MotionReveal className="border-t border-slate-200/80 py-6 flex flex-col md:flex-row justify-between items-center gap-2">
          <p className="text-xs font-mono text-slate-400">
            &copy; {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
          </p>
          <p className="text-[11px] font-medium text-slate-400">
            Made for teams that ship
          </p>
        </MotionReveal>
      </div>
    </motion.footer>
  );
}

function SocialLink({
  href,
  label,
  d,
}: {
  href: string;
  label: string;
  d: string;
}) {
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      whileHover={{ scale: 1.08, y: -2 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className="w-8 rounded-lg bg-slate-100 hover:bg-blue-50 inline-flex items-center justify-center text-slate-500 hover:text-blue-600 transition-colors"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d={d} />
      </svg>
    </motion.a>
  );
}
