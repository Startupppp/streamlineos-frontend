"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Magnetic } from "./motion/magnetic";
import {
  PRICING,
  PRICING_TIERS,
  bundleSavingsCopy,
  type BillingPeriod,
} from "@/lib/pricing";

export function LandingPricing() {
  const [period, setPeriod] = useState<BillingPeriod>("annual");

  return (
    <section id="pricing" className="relative py-16 lg:py-24">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
          className="max-w-2xl text-center mx-auto mb-10"
        >
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em] leading-[1.05] text-slate-900 mb-3">
            Free to start.{" "}
            <span className="text-blue-600">Honest as you grow.</span>
          </h2>
          <p className="text-slate-600 text-base leading-relaxed">
            One number per seat. No per-module pricing. No surprise add-ons.{" "}
            <span className="text-slate-500">{bundleSavingsCopy()}</span>
          </p>
        </motion.div>

        <BillingToggle period={period} onChange={setPeriod} />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 max-w-7xl mx-auto">
          {PRICING_TIERS.map((tier, i) => {
            const price =
              period === "annual" ? tier.priceLabel.annual : tier.priceLabel.monthly;
            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10% 0px" }}
                transition={{
                  duration: 0.6,
                  delay: i * 0.06,
                  ease: [0.22, 1, 0.36, 1] as const,
                }}
                whileHover={{ y: -4 }}
                className={`relative rounded-2xl border p-6 flex flex-col transition-all duration-300 ${
                  tier.highlight
                    ? "border-blue-400/40 bg-white shadow-[0_24px_60px_-20px_rgba(30,64,175,0.24)]"
                    : "border-slate-200 bg-white/70 backdrop-blur-sm hover:border-blue-300/40 hover:shadow-[0_16px_40px_-16px_rgba(30,64,175,0.16)]"
                }`}
              >
                {tier.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-[10px] font-bold text-white shadow-lg whitespace-nowrap">
                    <Sparkles className="h-3 w-3" />
                    {tier.badge}
                  </div>
                )}
                <div className="mb-4">
                  <h3 className="font-display text-xl font-bold text-slate-900 mb-1">
                    {tier.name}
                  </h3>
                  <p className="text-[11px] font-medium text-blue-600">
                    {tier.tagline}
                  </p>
                </div>
                <div className="mb-5 pb-5 border-b border-slate-100">
                  <p className="font-display text-4xl font-extrabold text-slate-900 tracking-tight leading-none">
                    {price}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono mt-1.5">
                    {tier.period}
                    {period === "annual" && tier.monthly && tier.monthly > 0 && (
                      <span className="ml-1.5 text-emerald-600 font-semibold">
                        · save {PRICING.annualDiscountPct}%
                      </span>
                    )}
                  </p>
                  <p className="text-[12px] text-slate-600 mt-3 leading-relaxed min-h-[36px]">
                    {tier.description}
                  </p>
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  {tier.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-[12.5px] text-slate-700 leading-relaxed"
                    >
                      <span className="mt-0.5 h-4 w-4 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 inline-flex items-center justify-center shrink-0">
                        <Check className="h-2.5 w-2.5 text-white" strokeWidth={3.5} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Magnetic strength={0.18}>
                  <Link href={tier.ctaHref} className="block">
                    <Button
                      variant={tier.highlight ? "default" : "outline"}
                      className="w-full h-10"
                    >
                      {tier.cta}
                      <ArrowRight className="ml-2 h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </Magnetic>
                <p className="mt-3 text-[11px] font-medium text-slate-400 text-center">
                  {tier.bestFor}
                </p>
              </motion.div>
            );
          })}
        </div>

        <p className="mt-10 text-center text-[12px] text-slate-500">
          Looking for a detailed breakdown?{" "}
          <Link href="/pricing" className="text-blue-600 hover:underline font-medium">
            See full pricing & feature comparison →
          </Link>
        </p>
      </div>
    </section>
  );
}

function BillingToggle({
  period,
  onChange,
}: {
  period: BillingPeriod;
  onChange: (p: BillingPeriod) => void;
}) {
  return (
    <div className="flex justify-center mb-10">
      <div className="inline-flex p-1 rounded-full border border-slate-200 bg-white/80 backdrop-blur-sm shadow-sm">
        <button
          onClick={() => onChange("monthly")}
          className={`px-4 py-1.5 rounded-full text-[12.5px] font-semibold transition-colors ${
            period === "monthly"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => onChange("annual")}
          className={`px-4 py-1.5 rounded-full text-[12.5px] font-semibold transition-colors inline-flex items-center gap-1.5 ${
            period === "annual"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Annual
          <span
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
              period === "annual"
                ? "bg-white/20 text-white"
                : "bg-emerald-50 text-emerald-700 border border-emerald-100"
            }`}
          >
            -{PRICING.annualDiscountPct}%
          </span>
        </button>
      </div>
    </div>
  );
}
