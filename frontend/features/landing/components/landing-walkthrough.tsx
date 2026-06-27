"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { walkthroughSteps } from "../data/pillars";

export function LandingWalkthrough() {
  return (
    <section id="features" className="relative py-16 lg:py-24">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
          className="max-w-2xl text-center mx-auto mb-14 lg:mb-20"
        >
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em] leading-[1.05] text-slate-900">
            One workspace.{" "}
            <span className="text-blue-600">Four moments that matter.</span>
          </h2>
        </motion.div>

        <div className="max-w-6xl mx-auto space-y-20 lg:space-y-28">
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
  return (
    <div
      className={`grid gap-8 lg:gap-14 lg:grid-cols-2 items-center ${
        isReverse ? "lg:[direction:rtl]" : ""
      }`}
    >
      <motion.div
        initial={{ opacity: 0, x: isReverse ? 32 : -32 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-15% 0px" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] as const }}
        className="lg:[direction:ltr]"
      >
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-blue-600 text-white text-[11px] font-bold font-mono shrink-0">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="text-[12px] font-medium text-blue-600">{step.eyebrow}</span>
        </div>
        <h3 className="font-display text-2xl lg:text-4xl font-bold text-slate-900 tracking-[-0.02em] leading-tight mb-4">
          {step.title}
        </h3>
        <p className="text-slate-600 text-base lg:text-lg leading-relaxed mb-5">
          {step.description}
        </p>
        <ul className="space-y-2.5">
          {step.bullets.map((b) => (
            <li key={b} className="flex items-start gap-3">
              <span className="mt-0.5 h-5 w-5 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 inline-flex items-center justify-center shrink-0 shadow-[0_4px_12px_-4px_rgba(59,130,246,0.5)]">
                <Check className="h-3 w-3 text-white" strokeWidth={3} />
              </span>
              <span className="text-[14px] text-slate-700">{b}</span>
            </li>
          ))}
        </ul>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: isReverse ? -32 : 32, scale: 0.97 }}
        whileInView={{ opacity: 1, x: 0, scale: 1 }}
        viewport={{ once: true, margin: "-15% 0px" }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] as const, delay: 0.08 }}
        className="lg:[direction:ltr]"
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
    <div className="relative aspect-[5/4] rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-sm overflow-hidden p-6 shadow-[0_20px_60px_-24px_rgba(30,64,175,0.18)]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(59,130,246,0.10),_transparent_60%)]" />
      <div className="relative h-full">
        <Visual />
      </div>
    </div>
  );
}

const cardCls = "rounded-xl border border-slate-200 bg-white p-4 shadow-sm";

function HireVisual() {
  const candidates = [
    { name: "Mira Joseph", role: "Sr Backend Engineer", score: 92 },
    { name: "Aaron Brooks", role: "Frontend Engineer", score: 88 },
    { name: "Sneha Rao", role: "Sr Backend Engineer", score: 84 },
  ];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
        <span>Candidates · AI scored</span>
        <span className="text-blue-600">3 new</span>
      </div>
      {candidates.map((c, i) => (
        <motion.div
          key={c.name}
          initial={{ opacity: 0, x: -16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: i * 0.1 }}
          className={`${cardCls} flex items-center justify-between`}
        >
          <div className="flex items-center gap-3">
            <span
              className="h-9 w-9 rounded-full inline-flex items-center justify-center text-[11px] font-bold text-white"
              style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
            >
              {c.name.split(" ").map((n) => n[0]).join("")}
            </span>
            <div>
              <p className="text-[12px] font-semibold text-slate-900">{c.name}</p>
              <p className="text-[10px] text-slate-500 font-mono">{c.role}</p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-emerald-700 px-2 py-1 rounded-md bg-emerald-50 border border-emerald-200">
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
    { label: "Workspace provisioned", done: false, current: true },
    { label: "Welcome email sent", done: false },
  ];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
        <span>Onboarding · Aarav Singh</span>
        <span className="text-blue-600">60%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
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
            className={`flex items-center gap-3 text-[12px] ${
              s.done ? "text-slate-600" : s.current ? "text-slate-900 font-medium" : "text-slate-400"
            }`}
          >
            <span
              className={`h-4 w-4 rounded-full border inline-flex items-center justify-center text-[8px] ${
                s.done
                  ? "bg-blue-600 border-blue-500 text-white"
                  : s.current
                  ? "border-cyan-400 text-cyan-600"
                  : "border-slate-300"
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
    <div className="grid grid-cols-3 gap-2 h-full">
      {cols.map((col, ci) => (
        <motion.div
          key={col.title}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: ci * 0.1 }}
          className={`rounded-xl border p-2.5 space-y-1.5 ${
            col.highlight
              ? "bg-blue-50 border-blue-200"
              : "bg-slate-50/70 border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 mb-1">
            <span>{col.title}</span>
            <span>{col.count}</span>
          </div>
          {col.items.map((it, ti) => (
            <motion.div
              key={it}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: ci * 0.1 + ti * 0.06 }}
              className="rounded-md bg-white border border-slate-200 p-2 text-[10px] text-slate-700 leading-tight shadow-sm"
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
      <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
        <span>Forecast · Q3</span>
        <span className="text-emerald-700">$1.42M ARR</span>
      </div>
      <div className="space-y-2.5 pt-2">
        {bars.map((b, i) => (
          <div key={b.label}>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-slate-700">{b.label}</span>
              <span className="text-slate-500 font-mono">${b.value}k</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200/70 overflow-hidden">
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
      <div className="pt-2 border-t border-slate-200 text-[10px] font-mono text-slate-500 flex items-center justify-between">
        <span>AI confidence</span>
        <span className="text-blue-600">87%</span>
      </div>
    </div>
  );
}
