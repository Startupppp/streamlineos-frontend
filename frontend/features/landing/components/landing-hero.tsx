"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  ArrowRight,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Magnetic } from "./motion/magnetic";
import { Marquee } from "./motion/marquee";
import { HERO_APP_CHIPS } from "../data/apps";
import { cheapestAnnualLabel, PRICING } from "@/lib/pricing";

const EASE_OUT_QUART = [0.22, 1, 0.36, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.07, ease: EASE_OUT_QUART },
  }),
};

export function LandingHero() {
  return (
    <section className="relative pt-24 pb-12 sm:pt-28 sm:pb-16 lg:pt-32 lg:pb-20 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-24 h-[min(420px,70vw)] w-[min(420px,70vw)] rounded-full bg-blue-400/20 blur-[120px]" />
        <div className="absolute -top-8 right-0 h-[min(420px,70vw)] w-[min(420px,70vw)] rounded-full bg-cyan-300/20 blur-[120px]" />
      </div>

      <div
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(rgba(30,64,175,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(30,64,175,0.06) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage:
            "radial-gradient(ellipse at center, black 0%, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 0%, transparent 70%)",
        }}
      />

      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 z-10 grid lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-14 items-center">
        <div className="lg:col-span-6 text-center lg:text-left min-w-0">
          <motion.div
            custom={0}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="inline-flex items-center gap-2 rounded-full glass-panel px-3.5 py-1.5 mb-5 sm:mb-6 max-w-full"
          >
            <Sparkles className="h-3 w-3 text-blue-500 shrink-0" />
            <span className="text-[11px] font-medium text-slate-700 truncate">
              One OS for every team function
            </span>
          </motion.div>

          <motion.h1
            custom={1}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="font-display text-[2.125rem] leading-[1.05] sm:text-5xl md:text-6xl lg:text-[4.5rem] xl:text-[5rem] font-extrabold tracking-[-0.03em] sm:leading-[0.98] mb-4 text-slate-900"
          >
            All your business
            <br />
            on <span className="brand-sweep">one platform.</span>
          </motion.h1>

          <motion.p
            custom={2}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="font-display mx-auto lg:mx-0 mb-2 max-w-xl text-base sm:text-lg md:text-xl font-bold text-slate-900"
          >
            Simple, efficient, yet affordable!
          </motion.p>

          <motion.p
            custom={2}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="font-sans mx-auto lg:mx-0 mb-6 max-w-xl text-sm sm:text-[15px] md:text-base text-slate-600 leading-relaxed px-1 sm:px-0"
          >
            <span className="font-semibold text-blue-600">
              {cheapestAnnualLabel()}
            </span>{" "}
            per seat / month (annual) for{" "}
            <span className="font-semibold text-slate-900">all apps</span> — HR,
            projects, CRM, chat, accounting, and more. Sub-100ms realtime.
            AI-assisted everywhere.
          </motion.p>

          <motion.div
            custom={3}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="flex flex-col sm:flex-row items-stretch sm:items-center lg:justify-start justify-center gap-3 mb-6 w-full sm:w-auto max-w-sm sm:max-w-none mx-auto lg:mx-0"
          >
            <Magnetic strength={0.35} className="w-full sm:w-auto">
              <Link href="/signin" className="block w-full sm:w-auto">
                <Button size="lg" className="h-12 w-full sm:w-auto px-7 text-[15px]">
                  Start now — it&apos;s free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </Magnetic>
            <a href="#apps" className="block w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="h-12 w-full sm:w-auto px-7 text-[15px]"
              >
                View all apps
                <ChevronRight className="ml-1.5 h-4 w-4" />
              </Button>
            </a>
          </motion.div>

          <motion.div
            custom={4}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="flex flex-wrap items-center lg:justify-start justify-center gap-x-4 sm:gap-x-5 gap-y-1.5 text-[11px] font-medium text-slate-400"
          >
            <span>No credit card</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" aria-hidden />
            <span>Instant access</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" aria-hidden />
            <span>Free up to {PRICING.freeSeatLimit} seats</span>
          </motion.div>

          <motion.div
            custom={5}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mt-8 -mx-4 sm:mx-0"
          >
            <Marquee speed={52}>
              <div className="flex gap-2 px-2">
                {HERO_APP_CHIPS.map((app) => {
                  const Icon = app.icon;
                  return (
                    <span
                      key={app.id}
                      className="inline-flex items-center gap-1.5 shrink-0 rounded-md bg-white/80 border border-slate-200/80 px-2.5 py-1.5 text-[11px] font-medium text-slate-700"
                    >
                      <Icon className="h-3 w-3 text-blue-600" aria-hidden />
                      {app.name}
                    </span>
                  );
                })}
              </div>
            </Marquee>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.25, ease: EASE_OUT_QUART }}
          className="lg:col-span-6 relative min-w-0 px-0 sm:px-4 md:px-8 lg:px-0"
        >
          <HeroPreview />
        </motion.div>
      </div>
    </section>
  );
}

function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[560px] pb-2 md:pb-10">
      <div className="absolute -inset-4 sm:-inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-blue-400/25 via-cyan-300/15 to-transparent blur-2xl" />

      <motion.div
        animate={{ y: [-6, 6, -6] }}
        transition={{ duration: 8, ease: "easeInOut", repeat: Infinity }}
        className="absolute -top-4 -left-2 md:-top-6 md:-left-6 lg:-left-16 z-20 w-[min(200px,42vw)] md:w-[220px] rounded-2xl glass-panel-strong p-3.5 md:p-4 shadow-[0_24px_60px_-20px_rgba(30,64,175,0.25)] rotate-[-6deg] hidden md:block"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-medium text-blue-600">
            Sprint 24
          </span>
          <span className="text-[10px] text-slate-500 font-mono">12/24</span>
        </div>
        <p className="text-[13px] font-semibold text-slate-900 mb-1">
          Ship onboarding v3
        </p>
        <p className="text-[11px] text-slate-500 leading-snug mb-3">
          Auto-create user → trigger welcome flow.
        </p>
        <div className="space-y-1.5">
          {[
            { label: "Schema migration", done: true },
            { label: "Sign flow QA", done: true },
            { label: "Email templates", done: false },
          ].map((t) => (
            <div key={t.label} className="flex items-center gap-2 text-[11px]">
              <span
                className={`h-3.5 w-3.5 rounded border inline-flex items-center justify-center ${
                  t.done
                    ? "bg-blue-600 border-blue-500"
                    : "border-slate-300 bg-white"
                }`}
              >
                {t.done && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
              </span>
              <span
                className={
                  t.done ? "text-slate-400 line-through" : "text-slate-700"
                }
              >
                {t.label}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [6, -6, 6] }}
        transition={{ duration: 8, ease: "easeInOut", repeat: Infinity }}
        className="relative z-10 rounded-2xl glass-panel-strong p-4 sm:p-5 md:p-6 shadow-[0_30px_80px_-24px_rgba(30,64,175,0.28)]"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-cyan-500" />
            <span className="text-[11px] font-medium text-slate-600">
              Pipeline · Q2
            </span>
          </div>
          <span className="text-[11px] font-mono text-emerald-600 px-2 py-0.5 rounded-full bg-emerald-500/10">
            +12.4%
          </span>
        </div>
        <div className="space-y-3.5">
          {[
            {
              label: "New",
              count: 142,
              pct: 100,
              color: "from-blue-500 to-blue-600",
            },
            {
              label: "Qualified",
              count: 86,
              pct: 70,
              color: "from-blue-500 to-cyan-500",
            },
            {
              label: "Proposal",
              count: 41,
              pct: 48,
              color: "from-cyan-500 to-teal-400",
            },
            {
              label: "Closed Won",
              count: 18,
              pct: 28,
              color: "from-teal-400 to-emerald-400",
            },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.08, duration: 0.5 }}
            >
              <div className="flex items-center justify-between mb-1.5 text-[12px]">
                <span className="text-slate-700 font-medium">{s.label}</span>
                <span className="text-slate-500 font-mono">{s.count}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200/70 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${s.pct}%` }}
                  transition={{
                    duration: 1.2,
                    delay: 0.6 + i * 0.08,
                    ease: EASE_OUT_QUART,
                  }}
                  className={`h-full rounded-full bg-gradient-to-r ${s.color}`}
                />
              </div>
            </motion.div>
          ))}
        </div>
        <div className="mt-5 pt-4 border-t border-slate-200/70 flex items-center justify-between text-[11px]">
          <span className="text-slate-500 font-medium">Forecast</span>
          <span className="font-mono text-slate-900 font-semibold">
            $2.4M ARR
          </span>
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [-4, 8, -4] }}
        transition={{ duration: 9, ease: "easeInOut", repeat: Infinity }}
        className="absolute -bottom-6 -right-2 md:-bottom-8 md:-right-6 lg:-right-12 z-20 w-[min(180px,40vw)] md:w-[200px] rounded-2xl glass-panel-strong p-3.5 md:p-4 shadow-[0_24px_60px_-20px_rgba(6,182,212,0.25)] rotate-[5deg] hidden md:block"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-medium text-cyan-600">
            Attendance
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-mono">
            +2.1%
          </span>
        </div>
        <p className="font-display text-3xl font-extrabold text-slate-900 leading-none mb-3">
          94<span className="text-lg text-slate-400">%</span>
        </p>
        <div className="flex items-end gap-1 h-10">
          {[42, 48, 51, 45, 49, 52, 47, 50, 48, 51, 46, 49].map((d, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-gradient-to-t from-blue-500/40 to-cyan-400/80"
              style={{ height: `${(d / 52) * 100}%` }}
            />
          ))}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1 text-[9px] font-mono text-slate-400">
          <span>Pres 47</span>
          <span className="text-center">WFH 8</span>
          <span className="text-right">Lv 3</span>
        </div>
      </motion.div>
    </div>
  );
}
