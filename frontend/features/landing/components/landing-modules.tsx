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
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em] leading-[1.05] text-slate-900 mb-3">
            One workspace. <br className="hidden sm:block" />
            <span className="text-blue-600">Every module you need.</span>
          </h2>
          <p className="text-slate-600 text-base leading-relaxed">
            Turn on what you need today. Add the rest when you grow.
          </p>
        </motion.div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {visible.map((m, i) => {
            const Icon = m.icon;
            return (
              <motion.div
                key={m.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10% 0px" }}
                transition={{ duration: 0.55, delay: (i % 3) * 0.07, ease: [0.22, 1, 0.36, 1] as const }}
                whileHover={{ y: -3 }}
                className="group relative rounded-xl border border-slate-200/80 bg-white/70 backdrop-blur-sm p-5 hover:border-blue-300/50 hover:shadow-[0_16px_40px_-16px_rgba(30,64,175,0.16)] transition-all duration-300 overflow-hidden"
              >
                <div className="absolute -top-12 -right-12 h-36 w-36 rounded-full bg-blue-300/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative">
                  <div className="flex items-start gap-4">
                    <span className="h-10 w-10 rounded-lg bg-blue-600 inline-flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                      <Icon className="h-4.5 w-4.5 text-white h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-[15px] font-bold text-slate-900 mb-1">
                        {m.title}
                      </h3>
                      <p className="text-[13px] text-slate-500 leading-relaxed">
                        {m.description}
                      </p>
                    </div>
                  </div>
                  {m.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3.5 pl-14">
                      {m.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-600"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
