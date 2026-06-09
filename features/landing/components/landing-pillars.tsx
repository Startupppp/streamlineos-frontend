"use client";

import { motion } from "framer-motion";
import { pillars } from "../data/pillars";

export function LandingPillars() {
  return (
    <section className="relative py-16 lg:py-24">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
          className="max-w-2xl text-center mx-auto mb-12"
        >
          <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-blue-600 mb-3">
            Why teams choose StreamlineOS
          </p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em] leading-[1.05] text-slate-900">
            Built like infrastructure.{" "}
            <span className="brand-text">Used like an app.</span>
          </h2>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {pillars.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10% 0px" }}
                transition={{ duration: 0.6, delay: (i % 3) * 0.08, ease: [0.22, 1, 0.36, 1] as const }}
                whileHover={{ y: -3 }}
                className="group relative rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur-sm p-6 lg:p-7 overflow-hidden hover:border-blue-300/60 hover:shadow-[0_18px_44px_-18px_rgba(30,64,175,0.18)] transition-all duration-400"
              >
                <div className="absolute -top-14 -left-14 h-44 w-44 rounded-full bg-blue-300/30 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative">
                  <div className="relative h-12 w-12 mb-4">
                    <div className="absolute inset-0 rounded-xl bg-blue-500/15 blur-md group-hover:bg-blue-500/25 transition-all" />
                    <motion.div
                      whileHover={{ rotate: 8, scale: 1.05 }}
                      transition={{ duration: 0.3 }}
                      className="relative h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 inline-flex items-center justify-center shadow-[0_8px_20px_-6px_rgba(59,130,246,0.5)]"
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </motion.div>
                  </div>
                  <h3 className="font-display text-lg font-bold text-slate-900 mb-2">
                    {p.title}
                  </h3>
                  <p className="text-[14px] text-slate-600 leading-relaxed">
                    {p.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
