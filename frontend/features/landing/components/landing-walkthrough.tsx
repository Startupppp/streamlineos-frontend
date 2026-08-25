"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { walkthroughSteps } from "../data/pillars";

export function LandingWalkthrough() {
  return (
    <section id="features" className="relative py-14 sm:py-16 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
          className="max-w-2xl text-center mx-auto mb-10 sm:mb-14 lg:mb-20"
        >
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em] leading-[1.05] text-muted-foreground">
            One workspace.{" "}
            <span className="text-status-info-ink">Four moments that matter.</span>
          </h2>
        </motion.div>

        <div className="max-w-6xl mx-auto space-y-14 sm:space-y-20 lg:space-y-28">
          {walkthroughSteps.map((step, i) => (
            <WalkthroughRow key={step.eyebrow} step={step} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function WalkthroughRow({
  step,
  index,
}: {
  step: (typeof walkthroughSteps)[number];
  index: number;
}) {
  const isReverse = index % 2 === 1;
  const [textIn, setTextIn] = useState(false);
  const [visualIn, setVisualIn] = useState(false);
  const handleTextEnter = useCallback(() => setTextIn(true), []);
  const handleVisualEnter = useCallback(() => setVisualIn(true), []);
  return (
    <div
      className={`grid gap-6 sm:gap-8 lg:gap-14 lg:grid-cols-2 items-center min-w-0 ${
        isReverse ? "lg:[direction:rtl]" : ""
      }`}
    >
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        onViewportEnter={handleTextEnter}
        viewport={{ once: true, margin: "-15% 0px" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] as const }}
        className={`lg:[direction:ltr] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
          textIn
            ? "translate-x-0 translate-y-0"
            : `translate-y-6 lg:translate-y-0 ${
                isReverse ? "lg:translate-x-8" : "lg:-translate-x-8"
              }`
        }`}
      >
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-blue-600 text-white text-dense font-bold font-mono shrink-0">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="text-xs font-medium text-status-info-ink">
            {step.eyebrow}
          </span>
        </div>
        <h3 className="font-display text-xl sm:text-2xl lg:text-4xl font-bold text-muted-foreground tracking-[-0.02em] leading-tight mb-3 sm:mb-4">
          {step.title}
        </h3>
        <p className="text-muted-foreground text-sm sm:text-base lg:text-lg leading-relaxed mb-4 sm:mb-5">
          {step.description}
        </p>
        <ul className="space-y-2.5">
          {step.bullets.map((b) => (
            <li key={b} className="flex items-start gap-3">
              <span className="mt-0.5 h-5 w-5 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 inline-flex items-center justify-center shrink-0 shadow-[0_4px_12px_-4px_rgba(59,130,246,0.5)]">
                <Check className="h-3 w-3 text-white" strokeWidth={3} />
              </span>
              <span className="text-label sm:text-sm text-muted-foreground min-w-0">
                {b}
              </span>
            </li>
          ))}
        </ul>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        onViewportEnter={handleVisualEnter}
        viewport={{ once: true, margin: "-15% 0px" }}
        transition={{
          duration: 0.8,
          ease: [0.22, 1, 0.36, 1] as const,
          delay: 0.08,
        }}
        className={`lg:[direction:ltr] transition-transform duration-700 delay-75 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
          visualIn
            ? "translate-x-0 translate-y-0 scale-100"
            : `translate-y-6 lg:translate-y-0 scale-[0.97] ${
                isReverse ? "lg:-translate-x-8" : "lg:translate-x-8"
              }`
        }`}
      >
        <WalkthroughVisual index={index} />
      </motion.div>
    </div>
  );
}

function WalkthroughVisual({ index }: { index: number }) {
  const visuals = [HireVisual, OnboardVisual, DeliverVisual, CloseVisual];
  const Visual = visuals[index] ?? HireVisual;
  return (
    <div className="relative aspect-[5/4] sm:aspect-[5/4] rounded-xl sm:rounded-2xl border border-border bg-white/80 backdrop-blur-sm overflow-hidden p-3.5 sm:p-6 shadow-[0_20px_60px_-24px_rgba(30,64,175,0.18)]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(59,130,246,0.10),_transparent_60%)]" />
      <div className="relative h-full min-w-0 overflow-hidden">
        <Visual />
      </div>
    </div>
  );
}

const cardCls =
  "rounded-lg sm:rounded-xl border border-border bg-white p-2.5 sm:p-4 shadow-sm";

function HireVisual() {
  const candidates = [
    { name: "Mira Joseph", role: "Sr Backend Engineer", score: 92 },
    { name: "Aaron Brooks", role: "Frontend Engineer", score: 88 },
    { name: "Sneha Rao", role: "Sr Backend Engineer", score: 84 },
  ];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-dense font-medium text-muted-foreground">
        <span>Candidates · AI scored</span>
        <span className="text-status-info-ink">3 new</span>
      </div>
      {candidates.map((c, i) => (
        <motion.div
          key={c.name}
          initial={{ opacity: 0, x: -16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: i * 0.1 }}
          className={`${cardCls} flex items-center justify-between gap-2 min-w-0`}
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-full inline-flex items-center justify-center text-dense font-bold text-white shrink-0"
              style={{
                background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
              }}
            >
              {c.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </span>
            <div className="min-w-0">
              <p className="text-dense sm:text-xs font-semibold text-muted-foreground truncate">
                {c.name}
              </p>
              <p className="text-micro sm:text-micro text-muted-foreground font-mono truncate">
                {c.role}
              </p>
            </div>
          </div>
          <span className="text-micro sm:text-dense font-mono text-status-success-ink px-1.5 sm:px-2 py-1 rounded-md bg-status-success-surface border border-status-success-rule shrink-0">
            {c.score}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

function OnboardVisual() {
  const steps = [
    { label: "Documents collected", done: true },
    { label: "Offer letter signed", done: true },
    { label: "Bank details added", done: true },
    { label: "Organization provisioned", done: false, current: true },
    { label: "Welcome email sent", done: false },
  ];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-dense font-medium text-muted-foreground">
        <span>Onboarding · Aarav Singh</span>
        <span className="text-status-info-ink">60%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: "60%" }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, delay: 0.3 }}
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
        />
      </div>
      <div className="space-y-2 pt-2">
        {steps.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.4 + i * 0.08 }}
            className={`flex items-center gap-3 text-xs ${
              s.done
                ? "text-muted-foreground"
                : s.current
                  ? "text-muted-foreground font-medium"
                  : "text-muted-foreground"
            }`}
          >
            <span
              className={`h-4 w-4 rounded-full border inline-flex items-center justify-center text-micro ${
                s.done
                  ? "bg-blue-600 border-status-info-rule text-white"
                  : s.current
                    ? "border-status-info-rule text-status-info-ink"
                    : "border-border"
              }`}
            >
              {s.done ? "✓" : s.current ? "•" : ""}
            </span>
            {s.label}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function DeliverVisual() {
  const cols = [
    { title: "Todo", count: 6, items: ["Migrate auth", "Add CSP"] },
    {
      title: "In progress",
      count: 4,
      items: ["Refactor billing", "QA payouts"],
      highlight: true,
    },
    { title: "Done", count: 12, items: ["Wire SSO", "Audit log v2"] },
  ];
  return (
    <div className="grid grid-cols-3 gap-1 sm:gap-2 h-full min-w-0">
      {cols.map((col, ci) => (
        <motion.div
          key={col.title}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: ci * 0.1 }}
          className={`rounded-lg sm:rounded-xl border p-1.5 sm:p-2.5 space-y-1 sm:space-y-1.5 min-w-0 ${
            col.highlight
              ? "bg-status-info-surface border-status-info-rule"
              : "bg-muted border-border"
          }`}
        >
          <div className="flex items-center justify-between gap-1 text-micro sm:text-dense font-medium text-muted-foreground mb-1 min-w-0">
            <span className="truncate">{col.title}</span>
            <span className="shrink-0">{col.count}</span>
          </div>
          {col.items.map((it, ti) => (
            <motion.div
              key={it}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: ci * 0.1 + ti * 0.06 }}
              className="rounded-md bg-white border border-border p-1.5 sm:p-2 text-micro sm:text-micro text-muted-foreground leading-tight shadow-sm truncate"
            >
              {it}
            </motion.div>
          ))}
        </motion.div>
      ))}
    </div>
  );
}

function CloseVisual() {
  const bars = [
    { label: "Won", value: 64, color: "from-emerald-400 to-cyan-400" },
    { label: "Negotiation", value: 42, color: "from-cyan-400 to-blue-500" },
    { label: "Proposal", value: 28, color: "from-blue-500 to-indigo-500" },
    { label: "Qualified", value: 18, color: "from-indigo-500 to-violet-500" },
  ];
  const maxBar = Math.max(...bars.map((b) => b.value));
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-dense font-medium text-muted-foreground">
        <span>Forecast · Q3</span>
        <span className="text-status-success-ink">$1.42M ARR</span>
      </div>
      <div className="space-y-2.5 pt-2">
        {bars.map((b, i) => (
          <div key={b.label}>
            <div className="flex items-center justify-between text-dense mb-1">
              <span className="text-muted-foreground">{b.label}</span>
              <span className="text-muted-foreground font-mono">${b.value}k</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${(b.value / maxBar) * 100}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.2 + i * 0.1 }}
                className={`h-full rounded-full bg-gradient-to-r ${b.color}`}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="pt-2 border-t border-border text-micro font-mono text-muted-foreground flex items-center justify-between">
        <span>AI confidence</span>
        <span className="text-status-info-ink">87%</span>
      </div>
    </div>
  );
}
