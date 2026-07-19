"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
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

  return (
    <section id="apps" className="relative py-14 sm:py-16 lg:py-20 border-y border-slate-200/60 bg-white/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <MotionReveal className="max-w-3xl mx-auto text-center mb-8">
          <motion.p
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
            className="text-[12px] font-semibold text-blue-600 mb-3 tracking-wide"
          >
            {LANDING_APPS.length}+ integrated apps
          </motion.p>
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] font-extrabold tracking-[-0.03em] leading-[1.08] text-slate-900 mb-4">
            All your business on{" "}
            <span className="text-blue-600">one platform.</span>
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Simple, efficient, yet affordable — from{" "}
            <span className="font-semibold text-slate-900">{cheapestAnnualLabel()}</span> per
            seat / month (annual) for{" "}
            <span className="font-semibold text-slate-900">all apps</span>. Got something to
            improve? There&apos;s an app for that. One-click enable, no complexity.
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
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: EASE_OUT }}
          className="flex justify-center mb-10"
        >
          <motion.button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-full border border-slate-200 bg-white text-[13px] font-semibold text-slate-800 hover:border-blue-300 hover:bg-blue-50/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
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
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: ci * 0.08, duration: 0.45, ease: EASE_OUT }}
                    >
                      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">
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
          <p className="text-[15px] text-slate-600 leading-relaxed italic">
            &ldquo;If you simplify everything, you can do anything.&rdquo;
          </p>
          <p className="text-[12px] text-slate-500 mt-2">
            Each app streamlines a process and empowers more people — tailored with native AI.
          </p>
          <motion.div whileHover={{ x: 4 }} transition={{ type: "spring", stiffness: 300 }}>
            <Link
              href="/signin"
              className="inline-flex items-center gap-1.5 mt-5 text-[13px] font-semibold text-blue-600 hover:text-blue-700 focus-visible:outline-none focus-visible:underline"
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
  return (
    <motion.span
      whileHover={{ scale: 1.05, y: -2 }}
      transition={staggerItemDelay(index, 0)}
      className="inline-flex items-center gap-2 shrink-0 rounded-full border border-slate-200 bg-white px-3.5 py-2 shadow-sm"
    >
      <Icon className="h-3.5 w-3.5 text-blue-600" aria-hidden />
      <span className="text-[12px] font-semibold text-slate-800 whitespace-nowrap">
        {app.name}
      </span>
    </motion.span>
  );
}

function AppCard({ app, index }: { app: LandingApp; index: number }) {
  const Icon = app.icon;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={staggerItemDelay(index, 0.04)}
      whileHover={{ y: -3, scale: 1.02 }}
      className="flex items-center gap-2 sm:gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3 hover:border-blue-300 hover:shadow-sm transition-colors duration-200 min-w-0"
    >
      <span className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 inline-flex items-center justify-center shrink-0">
        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" aria-hidden />
      </span>
      <span className="text-[12px] sm:text-[13px] font-semibold text-slate-900 leading-tight truncate min-w-0">
        {app.name}
      </span>
    </motion.div>
  );
}
