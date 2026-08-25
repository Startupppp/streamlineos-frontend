"use client";

import { motion, useReducedMotion } from "framer-motion";
import { pillars } from "../data/pillars";

export function LandingPillars() {
  const reduce = useReducedMotion();

  return (
    <section className="relative py-14 sm:py-16 lg:py-24 overflow-x-clip">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] as const }}
          className="max-w-2xl mb-8 sm:mb-12 lg:mb-14"
        >
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em] leading-[1.05] text-muted-foreground text-balance">
            Built like infrastructure.{" "}
            <span className="text-brand-core">Used like an app.</span>
          </h2>
          <p className="mt-3 text-muted-foreground text-sm sm:text-base text-pretty">
            Why teams choose StreamlineOS over a stack of point tools.
          </p>
        </motion.div>

        <div className="max-w-6xl mx-auto divide-y divide-border border-y border-border">
          {pillars.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.title}
                initial={reduce ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-8% 0px" }}
                transition={{
                  duration: 0.5,
                  delay: reduce ? 0 : i * 0.05,
                  ease: [0.22, 1, 0.36, 1] as const,
                }}
                className="group grid gap-3 sm:grid-cols-[auto_1fr_1.2fr] sm:gap-6 lg:gap-10 items-start py-5 sm:py-6 min-w-0"
              >
                <div className="h-10 w-10 rounded-lg bg-brand-core/8 border border-brand-core/15 inline-flex items-center justify-center group-hover:bg-brand-core group-hover:border-brand-core transition-colors duration-300">
                  <Icon className="h-[18px] w-[18px] text-brand-core group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="font-display text-sm sm:text-base font-bold text-muted-foreground sm:pt-2">
                  {p.title}
                </h3>
                <p className="text-label sm:text-sm text-muted-foreground leading-relaxed sm:pt-2">
                  {p.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
