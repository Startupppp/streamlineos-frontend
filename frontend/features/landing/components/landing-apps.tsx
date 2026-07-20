"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Marquee } from "./motion/marquee";
import { MotionReveal } from "./motion/motion-reveal";
import { EASE_OUT, staggerItemDelay } from "./motion/variants";
import {
  LANDING_APPS,
  HERO_APP_CHIPS,
  APP_CATEGORIES,
  type AppCategory,
  type LandingApp,
} from "../data/apps";
import { cheapestAnnualLabel } from "@/lib/pricing";

export function LandingApps() {
  const [expanded, setExpanded] = useState(false);
  const reduce = useReducedMotion();

  return (
    <section
      id="apps"
      className="relative py-14 sm:py-16 lg:py-20 border-y border-slate-200/70 bg-white/55 overflow-x-clip"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <MotionReveal className="max-w-2xl mx-auto text-center mb-8">
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] font-extrabold tracking-[-0.03em] leading-[1.08] text-slate-900 mb-4 text-balance">
            {LANDING_APPS.length}+ apps. One seat.{" "}
            <span className="text-brand-core">Zero stack tax.</span>
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed text-pretty">
            Enable what you need in one click — from{" "}
            <span className="font-semibold text-slate-900">{cheapestAnnualLabel()}</span>{" "}
            per seat / month (annual) for everything.
          </p>
        </MotionReveal>

        <div className="mb-8 -mx-4 sm:mx-0 overflow-hidden">
          <Marquee speed={48} className="py-2">
            <div className="flex items-center gap-2 px-2">
              {HERO_APP_CHIPS.map((app, i) => (
                <MarqueeChip key={app.id} app={app} index={i} />
              ))}
            </div>
          </Marquee>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: EASE_OUT }}
          className="flex justify-center mb-10"
        >
          <motion.button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            whileHover={reduce ? undefined : { scale: 1.03 }}
            whileTap={reduce ? undefined : { scale: 0.97 }}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-full border border-slate-200 bg-white text-[13px] font-semibold text-slate-800 hover:border-brand-core/40 hover:bg-brand-core/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-core focus-visible:ring-offset-2"
            aria-expanded={expanded}
          >
            {expanded ? "Show less" : "View all apps"}
            <motion.span
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.25, ease: EASE_OUT }}
            >
              <ChevronDown className="h-4 w-4" aria-hidden />
            </motion.span>
          </motion.button>
        </motion.div>

        <AnimatePresence initial={false}>
          {expanded ? (
            <motion.div
              key="apps-grid"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
              className="overflow-hidden"
            >
              <div className="max-w-5xl mx-auto space-y-10 pb-2">
                {(Object.keys(APP_CATEGORIES) as AppCategory[]).map((cat, ci) => {
                  const apps = LANDING_APPS.filter((a) => a.category === cat);
                  if (apps.length === 0) return null;
                  return (
                    <motion.div
                      key={cat}
                      initial={reduce ? false : { opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: ci * 0.08, duration: 0.45, ease: EASE_OUT }}
                    >
                      <h3 className="text-[12px] font-semibold text-slate-500 mb-3">
                        {APP_CATEGORIES[cat]}
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {apps.map((app, i) => (
                          <AppCard key={app.id} app={app} index={i} />
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <MotionReveal delay={0.1} className="mt-12 max-w-2xl mx-auto text-center">
          <p className="text-[15px] text-slate-600 leading-relaxed">
            Each app streamlines a process and empowers more people — tailored with
            native AI.
          </p>
          <motion.div
            whileHover={reduce ? undefined : { x: 4 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Link
              href="/signin"
              className="inline-flex items-center gap-1.5 mt-5 text-[13px] font-semibold text-brand-core hover:text-brand-deep focus-visible:outline-none focus-visible:underline"
            >
              Start now — it&apos;s free
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </motion.div>
        </MotionReveal>
      </div>
    </section>
  );
}

function MarqueeChip({ app, index }: { app: LandingApp; index: number }) {
  const Icon = app.icon;
  const reduce = useReducedMotion();
  return (
    <motion.span
      whileHover={reduce ? undefined : { scale: 1.05, y: -2 }}
      transition={staggerItemDelay(index, 0)}
      className="inline-flex items-center gap-2 shrink-0 rounded-full border border-slate-200 bg-white px-3.5 py-2 shadow-sm"
    >
      <Icon className="h-3.5 w-3.5 text-brand-core" aria-hidden />
      <span className="text-[12px] font-semibold text-slate-800 whitespace-nowrap">
        {app.name}
      </span>
    </motion.span>
  );
}

function AppCard({ app, index }: { app: LandingApp; index: number }) {
  const Icon = app.icon;
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={staggerItemDelay(index, 0.04)}
      whileHover={reduce ? undefined : { y: -2 }}
      className="flex items-center gap-2 sm:gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3 hover:border-brand-core/40 hover:shadow-sm transition-colors duration-200 min-w-0"
    >
      <span className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-gradient-to-br from-brand-core to-brand-cyan inline-flex items-center justify-center shrink-0">
        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" aria-hidden />
      </span>
      <span className="text-[12px] sm:text-[13px] font-semibold text-slate-900 leading-tight truncate min-w-0">
        {app.name}
      </span>
    </motion.div>
  );
}
