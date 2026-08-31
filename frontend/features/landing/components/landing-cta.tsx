"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Magnetic } from "./motion/magnetic";
import { PRICING } from "@/lib/pricing";
import { BRAND_NAME } from "@/lib/branding";

export function LandingCTA() {
  const reduce = useReducedMotion();

  return (
    <section className="relative py-14 sm:py-16 lg:py-24 overflow-x-clip">
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[min(480px,70vw)] w-[min(800px,140vw)] rounded-full bg-brand-bright/20 blur-[140px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[min(360px,50vw)] w-[min(700px,120vw)] rounded-full bg-brand-cyan/15 blur-[120px]" />
      </div>

      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] as const }}
          className="relative max-w-4xl mx-auto text-center"
        >
          <div className="relative bg-status-neutral-fill p-6 sm:p-10 lg:p-16 rounded-2xl overflow-hidden">
            <div className="absolute inset-0 pointer-events-none" aria-hidden>
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-[300px] w-[min(600px,120vw)] rounded-full bg-brand-core/35 blur-3xl" />
              <div className="absolute bottom-0 right-0 h-[200px] w-[min(400px,80vw)] rounded-full bg-brand-cyan/25 blur-3xl" />
            </div>

            <div className="relative">
              <p className="text-xs font-medium text-brand-bright mb-5 sm:mb-6">
                Free for the first {PRICING.freeSeatLimit} seats
              </p>

              <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-[-0.03em] leading-[1.02] sm:leading-[0.98] text-white mb-4 sm:mb-5 text-balance">
                Run the company in{" "}
                <span className="text-brand-cyan">{BRAND_NAME}.</span>
              </h2>

              <p className="text-muted-foreground text-sm sm:text-base lg:text-lg leading-relaxed max-w-xl mx-auto mb-8 sm:mb-10 text-pretty">
                Every app your team runs on, in one place. Sign in to get started.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-sm sm:max-w-none mx-auto">
                <Magnetic strength={reduce ? 0 : 0.35} className="w-full sm:w-auto">
                  <Link href="/signin" className="block w-full sm:w-auto">
                    <Button
                      size="lg"
                      className="bg-white text-foreground hover:bg-muted font-bold border-0 h-12 w-full sm:w-auto px-8 text-sm"
                    >
                      Get started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </Magnetic>
                <Link href="#pricing" className="block w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/20 bg-white/8 text-white hover:bg-white/15 hover:text-white hover:border-white/30 h-12 w-full sm:w-auto px-8 text-sm"
                  >
                    See pricing
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
