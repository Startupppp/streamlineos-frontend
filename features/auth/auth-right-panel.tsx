"use client";

import { motion } from "framer-motion";
import { TrendingUp, CheckCircle2, Users, Sparkles, Quote } from "lucide-react";

const EASE_OUT_QUART = [0.22, 1, 0.36, 1] as const;

export function AuthRightPanel() {
  return (
    <div className="relative h-full w-full overflow-hidden flex flex-col">
      <div
        className="absolute inset-0 opacity-[0.35] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(30,64,175,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(30,64,175,0.06) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse at center, black 0%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 0%, transparent 75%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE_OUT_QUART }}
        className="relative z-10 px-12 pt-14"
      >
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 border border-blue-200 px-3 py-1 mb-5">
          <Sparkles className="h-3 w-3 text-blue-600" />
          <span className="text-[12px] font-medium text-blue-700">
            One OS for every team function
          </span>
        </div>

        <h2 className="font-display text-[2.1rem] xl:text-[2.4rem] font-extrabold leading-[1.04] tracking-[-0.025em] text-slate-900 max-w-md">
          Run your company on{" "}
          <span className="text-blue-600">one platform.</span>
        </h2>

        <p className="text-[14px] text-slate-600 leading-relaxed mt-3 max-w-md">
          HR, projects, CRM, chat — unified. Sub-100ms realtime. AI-assisted everywhere.
        </p>
      </motion.div>

      <div className="relative z-10 flex-1 min-h-0 flex items-center justify-center px-12 py-8">
        <FloatingComposition />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4, ease: EASE_OUT_QUART }}
        className="relative z-10 px-12 pb-12"
      >
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white/85 backdrop-blur-sm px-5 py-4 shadow-[0_18px_44px_-22px_rgba(30,64,175,0.15)]">
          <span
            className="h-10 w-10 rounded-full inline-flex items-center justify-center text-[12px] font-bold text-white shrink-0 bg-blue-600"
          >
            AM
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-slate-700 leading-snug mb-1.5">
              <Quote className="inline h-3 w-3 text-blue-500/60 mr-1 -mt-1" />
              StreamlineOS replaced five separate tools. Our weekly status meeting is gone.
            </p>
            <p className="text-[11px] font-mono text-slate-500">
              <span className="font-semibold text-slate-900 not-italic">Arjun Mehta</span>
              {" · "}CTO, FinScale
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function FloatingComposition() {
  return (
    <div className="relative w-full max-w-[420px] aspect-[5/4]">
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-blue-300/30 via-cyan-200/20 to-transparent blur-2xl" />

      <motion.div
        initial={{ opacity: 0, x: -30, y: 14 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2, ease: EASE_OUT_QUART }}
        className="absolute top-0 left-0 w-[230px] rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-sm p-4 shadow-[0_22px_50px_-22px_rgba(30,64,175,0.22)] -rotate-[3deg] z-20"
      >
        <motion.div
          animate={{ y: [-3, 3, -3] }}
          transition={{ duration: 7, ease: "easeInOut", repeat: Infinity }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-medium text-blue-600">
              Sprint 24
            </span>
            <span className="text-[9px] font-mono text-slate-400">12/24</span>
          </div>
          <p className="text-[12px] font-semibold text-slate-900 mb-1.5 leading-tight">
            Ship onboarding v3
          </p>
          <div className="space-y-1.5">
            {[
              { label: "Schema migration", done: true },
              { label: "Sign flow QA", done: true },
              { label: "Email templates", done: false },
            ].map((t) => (
              <div key={t.label} className="flex items-center gap-1.5 text-[10.5px]">
                <span
                  className={`h-3 w-3 rounded-[3px] border inline-flex items-center justify-center shrink-0 ${
                    t.done ? "bg-blue-600 border-blue-500" : "border-slate-300 bg-white"
                  }`}
                >
                  {t.done && <CheckCircle2 className="h-2 w-2 text-white" strokeWidth={3} />}
                </span>
                <span className={t.done ? "text-slate-400 line-through" : "text-slate-700"}>
                  {t.label}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.05, ease: EASE_OUT_QUART }}
        className="absolute top-[18%] left-[22%] right-0 z-10"
      >
        <motion.div
          animate={{ y: [2, -2, 2] }}
          transition={{ duration: 6, ease: "easeInOut", repeat: Infinity }}
          className="rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-sm p-5 shadow-[0_28px_60px_-22px_rgba(30,64,175,0.28)]"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-[11px] font-medium text-slate-600">
                Pipeline · Q2
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-700 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-100">
              +12.4%
            </span>
          </div>

          <div className="space-y-2.5">
            {[
              { label: "New", count: 142, pct: 100, color: "from-blue-500 to-blue-600" },
              { label: "Qualified", count: 86, pct: 72, color: "from-blue-500 to-cyan-500" },
              { label: "Proposal", count: 41, pct: 48, color: "from-cyan-500 to-teal-400" },
              { label: "Closed Won", count: 18, pct: 28, color: "from-teal-400 to-emerald-400" },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, delay: 0.4 + i * 0.07 }}
              >
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-700 font-medium">{s.label}</span>
                  <span className="text-slate-500 font-mono">{s.count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-200/70 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${s.pct}%` }}
                    transition={{ duration: 1, delay: 0.5 + i * 0.07, ease: EASE_OUT_QUART }}
                    className={`h-full rounded-full bg-gradient-to-r ${s.color}`}
                  />
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[10px]">
            <span className="text-slate-500 font-medium">
              Forecast
            </span>
            <span className="font-mono text-slate-900 font-semibold">$2.4M ARR</span>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 30, y: -14 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.7, delay: 0.4, ease: EASE_OUT_QUART }}
        className="absolute bottom-0 right-0 w-[200px] rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-sm p-4 shadow-[0_22px_50px_-22px_rgba(6,182,212,0.25)] rotate-[3deg] z-20"
      >
        <motion.div
          animate={{ y: [-2, 3, -2] }}
          transition={{ duration: 8, ease: "easeInOut", repeat: Infinity }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Users className="h-3 w-3 text-cyan-600" />
              <span className="text-[10px] font-medium text-slate-600">
                Attendance
              </span>
            </div>
            <span className="text-[9px] font-mono text-emerald-700 px-1.5 py-0.5 rounded bg-emerald-50">
              94%
            </span>
          </div>
          <p className="font-display text-2xl font-extrabold text-slate-900 leading-none mb-2.5">
            47<span className="text-sm font-bold text-slate-400">/52</span>
          </p>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 14 }).map((_, i) => {
              const intensity = [0.25, 0.45, 0.7, 0.9, 1, 0.8, 0.55][i % 7];
              return (
                <div
                  key={i}
                  className="aspect-square rounded-[3px]"
                  style={{ background: `rgba(59, 130, 246, ${intensity})` }}
                />
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
