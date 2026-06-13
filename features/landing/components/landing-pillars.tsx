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
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em] leading-[1.05] text-slate-900">
            Built like infrastructure.{" "}
            <span className="text-blue-600">Used like an app.</span>
          </h2>
          <p className="mt-3 text-slate-500 text-base">Why teams choose StreamlineOS over a stack of point tools.</p>
        </motion.div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {pillars.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10% 0px" }}
                transition={{ duration: 0.55, delay: (i % 3) * 0.07, ease: [0.22, 1, 0.36, 1] as const }}
                whileHover={{ y: -3 }}
                className="group relative rounded-xl border border-slate-200/80 bg-white/70 backdrop-blur-sm p-6 overflow-hidden hover:border-blue-300/50 hover:shadow-[0_16px_40px_-16px_rgba(30,64,175,0.16)] transition-all duration-300"
              >
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(59,130,246,0.06),_transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
                <div className="relative">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 border border-blue-100 inline-flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:border-blue-600 transition-all duration-300">
                    <Icon className="h-[18px] w-[18px] text-blue-600 group-hover:text-white transition-colors duration-300" />
                  </div>
                  <h3 className="font-display text-[15px] font-bold text-slate-900 mb-2">
                    {p.title}
                  </h3>
                  <p className="text-[13px] text-slate-500 leading-relaxed">
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
