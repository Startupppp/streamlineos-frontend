"use client";

import { motion } from "framer-motion";
import { modules } from "../data/modules";

const visible = modules.slice(0, 6);

export function LandingModules() {
  return (
    <section id="modules" className="relative py-16 lg:py-24">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-[10%] h-[280px] w-[280px] rounded-full bg-blue-300/15 blur-[100px]" />
        <div className="absolute bottom-1/4 right-[10%] h-[260px] w-[260px] rounded-full bg-cyan-300/15 blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
          className="max-w-2xl mx-auto text-center mb-12"
        >
          <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-blue-600 mb-3">
            And everything else
          </p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em] leading-[1.05] text-slate-900 mb-3">
            One workspace. <br className="hidden sm:block" />
            <span className="brand-text">Every module you need.</span>
          </h2>
          <p className="text-slate-600 text-base leading-relaxed">
            Turn on what you need today. Add the rest when you grow.
          </p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {visible.map((m, i) => {
            const Icon = m.icon;
            return (
              <motion.div
                key={m.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10% 0px" }}
                transition={{ duration: 0.55, delay: (i % 3) * 0.07, ease: [0.22, 1, 0.36, 1] as const }}
                whileHover={{ y: -4 }}
                className="group relative rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur-sm p-6 hover:border-blue-400/40 hover:shadow-[0_20px_50px_-20px_rgba(30,64,175,0.18)] transition-all duration-400 overflow-hidden"
              >
                <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gradient-to-br from-blue-300/40 to-cyan-300/30 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative">
                  <span className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 inline-flex items-center justify-center mb-4 shadow-[0_8px_18px_-6px_rgba(59,130,246,0.5)] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                    <Icon className="h-5 w-5 text-white" />
                  </span>
                  <h3 className="font-display text-lg font-bold text-slate-900 mb-1.5">
                    {m.title}
                  </h3>
                  <p className="text-[13px] text-slate-600 leading-relaxed mb-4">
                    {m.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {m.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] font-mono uppercase tracking-[0.14em] px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100 text-blue-700"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
