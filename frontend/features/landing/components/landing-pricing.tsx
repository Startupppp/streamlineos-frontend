"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { bundleSavingsCopy } from "@/lib/pricing";
import { PricingTierGrid } from "./pricing-tier-grid";
import { SavingsCalculator } from "./savings-calculator";

export function LandingPricing() {
  return (
    <section id="pricing" className="relative py-16 lg:py-24 bg-slate-50/80">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-8% 0px" }}
          transition={{ duration: 0.55 }}
          className="max-w-3xl text-center mx-auto mb-8"
        >
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em] leading-[1.05] text-slate-900 mb-3">
            You are not dreaming!
          </h2>
          <p className="text-slate-600 text-base leading-relaxed">
            One price per seat. Every app included. {bundleSavingsCopy()}
          </p>
        </motion.div>

        <PricingTierGrid />

        <div className="mt-16 max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h3 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
              Cut costs with StreamlineOS
            </h3>
            <p className="text-[13px] text-slate-600 mt-1.5">
              Cost savings based on average price per user for each app.
            </p>
          </div>
          <SavingsCalculator />
        </div>

        <p className="mt-10 text-center text-[12px] text-slate-500">
          Need the full feature matrix?{" "}
          <Link href="/pricing" className="text-blue-600 hover:underline font-medium">
            See detailed pricing comparison →
          </Link>
        </p>
      </div>
    </section>
  );
}
