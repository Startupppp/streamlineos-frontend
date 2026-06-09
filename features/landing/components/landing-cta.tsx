"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Magnetic } from "./motion/magnetic";

export function LandingCTA() {
  return (
    <section className="relative py-16 lg:py-24 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[480px] w-[800px] rounded-full bg-blue-400/15 blur-[140px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[360px] w-[700px] rounded-full bg-cyan-300/15 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(30,64,175,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(30,64,175,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            maskImage:
              "radial-gradient(ellipse at center, black 0%, transparent 65%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at center, black 0%, transparent 65%)",
          }}
        />
      </div>

      <div className="container relative mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] as const }}
          className="relative max-w-4xl mx-auto rounded-[2.25rem] overflow-hidden text-center"
        >
          <div className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-10 lg:p-16 rounded-[2.25rem]">
            <div className="absolute inset-0 pointer-events-none rounded-[2.25rem] overflow-hidden">
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-[300px] w-[600px] rounded-full bg-cyan-400/20 blur-3xl" />
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(96,165,250,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(96,165,250,0.18) 1px, transparent 1px)",
                  backgroundSize: "44px 44px",
                  maskImage:
                    "radial-gradient(ellipse at center, black 0%, transparent 70%)",
                  WebkitMaskImage:
                    "radial-gradient(ellipse at center, black 0%, transparent 70%)",
                }}
              />
            </div>

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur border border-white/15 px-3.5 py-1.5 mb-6">
                <Sparkles className="h-3 w-3 text-cyan-300" />
                <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-cyan-100">
                  Free for the first 10 seats
                </span>
              </div>

              <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.03em] leading-[0.98] text-white mb-5">
                Run your company
                <br />
                <span className="bg-gradient-to-r from-cyan-300 via-blue-200 to-cyan-300 bg-clip-text text-transparent">
                  on one OS.
                </span>
              </h2>

              <p className="text-blue-100/80 text-base lg:text-lg leading-relaxed max-w-xl mx-auto mb-8">
                30 minutes to set up. Zero credit card. Cancel whenever — but
                you probably won&apos;t.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Magnetic strength={0.4}>
                  <Link href="/signin">
                    <Button
                      size="lg"
                      className="bg-white text-slate-900 hover:bg-blue-50 font-bold border-0 shadow-[0_20px_60px_-12px_rgba(255,255,255,0.4)] h-13 px-8 text-base"
                    >
                      Start for free
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </Magnetic>
                <Link href="#pricing">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/25 bg-white/10 backdrop-blur text-white hover:bg-white/20 hover:text-white hover:border-white/40 h-13 px-8 text-base"
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
