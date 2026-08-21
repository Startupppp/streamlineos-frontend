"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { PRICING } from "@/lib/pricing";
import { BRAND_NAME } from "@/lib/branding";
import { WaitlistForm } from "./waitlist-form";

export function LandingCTA() {
  const reduce = useReducedMotion();

  const assurances = [
    `Free for the first ${PRICING.freeSeatLimit} seats at launch`,
    "No credit card, now or at sign-up",
    "One email when your workspace is ready",
  ];

  return (
    <section
      id="waitlist"
      className="relative scroll-mt-24 overflow-x-clip py-14 sm:py-16 lg:py-24"
    >
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
          className="relative mx-auto max-w-5xl"
        >
          <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-6 sm:p-10 lg:p-12">
            <div className="absolute inset-0 pointer-events-none" aria-hidden>
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-[300px] w-[min(600px,120vw)] rounded-full bg-brand-core/35 blur-3xl" />
              <div className="absolute bottom-0 right-0 h-[200px] w-[min(400px,80vw)] rounded-full bg-brand-cyan/25 blur-3xl" />
            </div>

            <div className="relative grid items-center gap-9 lg:grid-cols-[1fr_minmax(0,26rem)] lg:gap-14">
              <div className="text-center lg:text-left">
                <p className="mb-4 text-[12px] font-medium tracking-wide text-brand-bright uppercase">
                  Early access
                </p>

                <h2 className="mb-4 font-display text-3xl sm:text-4xl lg:text-[2.9rem] font-extrabold leading-[1.04] tracking-[-0.03em] text-white text-balance">
                  Be first inside{" "}
                  <span className="text-brand-cyan">{BRAND_NAME}.</span>
                </h2>

                <p className="mx-auto mb-7 max-w-md text-[15px] leading-relaxed text-slate-400 text-pretty lg:mx-0">
                  HR, projects, CRM, chat, and accounting on one platform.
                  Join the waitlist and we&apos;ll open your workspace the day
                  we launch.
                </p>

                <ul className="mx-auto inline-flex max-w-md flex-col gap-2.5 text-left lg:mx-0">
                  {assurances.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-[14px] leading-snug text-slate-300"
                    >
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-brand-cyan"
                        strokeWidth={2.5}
                        aria-hidden
                      />
                      {item}
                    </li>
                  ))}
                </ul>

                <p className="mt-7 text-[13px] text-slate-500">
                  Want the numbers first?{" "}
                  <Link
                    href="#pricing"
                    className="font-medium text-slate-300 underline-offset-4 transition-colors hover:text-white hover:underline"
                  >
                    See pricing
                  </Link>
                </p>
              </div>

              <WaitlistForm />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
