"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Magnetic } from "./motion/magnetic";
import { pricingTiers } from "../data/faqs";

export function LandingPricing() {
  return (
    <section id="pricing" className="relative py-16 lg:py-24">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
          className="max-w-2xl text-center mx-auto mb-12"
        >
          <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-blue-600 mb-3">
            Pricing
          </p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em] leading-[1.05] text-slate-900 mb-3">
            Free to start.{" "}
            <span className="brand-text">Honest as you grow.</span>
          </h2>
          <p className="text-slate-600 text-base leading-relaxed">
            No per-module pricing. No surprise add-ons. One number per seat.
          </p>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-3 max-w-6xl mx-auto">
          {pricingTiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] as const }}
              whileHover={{ y: -4 }}
              className={`relative rounded-3xl border p-7 flex flex-col transition-all duration-300 ${
                tier.highlight
                  ? "border-blue-400/40 bg-white shadow-[0_30px_80px_-24px_rgba(30,64,175,0.28)]"
                  : "border-slate-200 bg-white/70 backdrop-blur-sm hover:border-blue-300/40 hover:shadow-[0_18px_44px_-18px_rgba(30,64,175,0.18)]"
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-[10px] font-mono uppercase tracking-[0.18em] text-white font-bold shadow-lg">
                  <Sparkles className="h-3 w-3" />
                  Most popular
                </div>
              )}
              <div className="mb-5">
                <h3 className="font-display text-2xl font-bold text-slate-900 mb-1.5">
                  {tier.name}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {tier.description}
                </p>
              </div>
              <div className="mb-6">
                <p className="font-display text-5xl font-extrabold text-slate-900 tracking-tight leading-none">
                  {tier.price}
                </p>
                <p className="text-[12px] text-slate-500 font-mono mt-1.5">
                  {tier.period}
                </p>
              </div>
              <ul className="space-y-2.5 mb-7 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-[13px] text-slate-700">
                    <span className="mt-0.5 h-5 w-5 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 inline-flex items-center justify-center shrink-0 shadow-[0_4px_12px_-4px_rgba(59,130,246,0.5)]">
                      <Check className="h-3 w-3 text-white" strokeWidth={3} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Magnetic strength={0.18}>
                <Link href="/signin" className="block">
                  <Button
                    className={`w-full h-11 font-semibold ${
                      tier.highlight
                        ? "bg-slate-900 text-white hover:bg-slate-800 border-0"
                        : "bg-white text-slate-900 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {tier.cta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </Magnetic>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
