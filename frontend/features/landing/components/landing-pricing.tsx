"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { bundleSavingsCopy } from "@/lib/pricing";
import { PricingTierGrid } from "./pricing-tier-grid";
import { SavingsCalculator } from "./savings-calculator";

export function LandingPricing() {
  return (
    <section id="pricing" className="relative py-14 sm:py-16 lg:py-24 bg-muted">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-8% 0px" }}
          transition={{ duration: 0.55 }}
          className="max-w-3xl text-center mx-auto mb-8"
        >
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em] leading-[1.05] text-foreground mb-3">
            You are not dreaming!
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
            One price per seat. Every app included. {bundleSavingsCopy()}
          </p>
        </motion.div>

        <PricingTierGrid />

        <div className="mt-12 sm:mt-16 max-w-4xl mx-auto">
          <div className="text-center mb-6 sm:mb-8">
            <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              Cut costs with StreamlineOS
            </h3>
            <p className="text-xs sm:text-label text-muted-foreground mt-1.5">
              Cost savings based on average price per user for each app.
            </p>
          </div>
          <SavingsCalculator />
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Need the full feature matrix?{" "}
          <Link href="/pricing" className="text-status-info-ink hover:underline font-medium">
            See detailed pricing comparison →
          </Link>
        </p>
      </div>
    </section>
  );
}
