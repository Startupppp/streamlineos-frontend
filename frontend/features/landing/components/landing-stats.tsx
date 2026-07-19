"use client";

import { motion } from "framer-motion";
import { NumberCounter } from "./motion/number-counter";
import { stats } from "../data/modules";

export function LandingStats() {
  return (
    <section className="relative py-10 sm:py-12 lg:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
          className="relative rounded-xl sm:rounded-2xl glass-panel-strong overflow-hidden"
        >
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-[200px] w-[min(700px,140vw)] rounded-full bg-blue-400/15 blur-[100px] pointer-events-none" />
          <div className="relative grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-slate-200/70">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10% 0px" }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                className="px-3 sm:px-6 py-6 sm:py-9 text-center min-w-0"
              >
                <p className="font-display text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-blue-700 mb-1.5 leading-none tabular-nums">
                  <NumberCounter
                    value={stat.value}
                    suffix={stat.suffix}
                    prefix={stat.prefix}
                    decimals={stat.decimals ?? 0}
                  />
                </p>
                <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 leading-snug px-0.5">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
