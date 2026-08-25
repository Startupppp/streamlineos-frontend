"use client";

import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND_NAME } from "@/lib/branding";
import { cheapestAnnualLabel, PRICING } from "@/lib/pricing";
import { Magnetic } from "./motion/magnetic";
import { FloatingComposition } from "@/components/brand/floating-composition";
import { AnimatedLogo } from "./animated-logo";

const EASE_OUT_QUART = [0.22, 1, 0.36, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: 0.08 + i * 0.07, ease: EASE_OUT_QUART },
  }),
};

const fadeOnly: Variants = {
  hidden: { opacity: 0 },
  visible: (i: number) => ({
    opacity: 1,
    transition: { duration: 0.45, delay: 0.08 + i * 0.06, ease: EASE_OUT_QUART },
  }),
};

export function LandingHero() {
  const reduce = useReducedMotion();
  const variants = reduce ? fadeOnly : fadeUp;

  return (
    <section className="relative min-h-[100svh] flex flex-col justify-center overflow-x-clip pt-24 pb-14 sm:pt-28 sm:pb-16 lg:pt-28 lg:pb-20">
      <HeroAtmosphere />

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-8 xl:gap-12 items-center">
          <div className="lg:col-span-5 text-center lg:text-left min-w-0">
            <motion.div
              custom={0}
              initial="hidden"
              animate="visible"
              variants={variants}
              className="inline-flex items-center gap-3 mb-5 sm:mb-6"
            >
              <AnimatedLogo size={52} className="rounded-xl" />
              <span className="font-display text-[1.65rem] sm:text-[2.15rem] md:text-[2.45rem] font-extrabold tracking-[-0.035em] leading-none text-foreground text-balance">
                {BRAND_NAME.slice(0, -2)}
                <span className="brand-sweep">OS</span>
              </span>
            </motion.div>

            <motion.h1
              custom={1}
              initial="hidden"
              animate="visible"
              variants={variants}
              className="font-display text-[1.85rem] leading-[1.06] sm:text-4xl md:text-[2.75rem] lg:text-[2.9rem] xl:text-[3.25rem] font-extrabold tracking-[-0.03em] text-foreground text-balance mb-4 sm:mb-5"
            >
              All your business on{" "}
              <span className="brand-sweep">one platform.</span>
            </motion.h1>

            <motion.p
              custom={2}
              initial="hidden"
              animate="visible"
              variants={variants}
              className="mx-auto lg:mx-0 mb-7 sm:mb-8 max-w-md text-sm sm:text-base text-muted-foreground leading-relaxed text-pretty"
            >
              HR, projects, CRM, chat, and accounting — from{" "}
              <span className="font-semibold text-foreground">{cheapestAnnualLabel()}</span>
              /seat monthly when billed annually.
            </motion.p>

            <motion.div
              custom={3}
              initial="hidden"
              animate="visible"
              variants={variants}
              className="flex flex-col sm:flex-row items-stretch sm:items-center lg:justify-start justify-center gap-3 w-full sm:w-auto max-w-sm sm:max-w-none mx-auto lg:mx-0"
            >
              <Magnetic strength={reduce ? 0 : 0.32} className="w-full sm:w-auto">
                <Link href="/signin" className="block w-full sm:w-auto">
                  <Button size="lg" className="h-12 w-full sm:w-auto px-7 text-sm">
                    Start free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </Magnetic>
              <a href="#apps" className="block w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 w-full sm:w-auto px-7 text-sm bg-white/70"
                >
                  Explore apps
                  <ChevronRight className="ml-1.5 h-4 w-4" />
                </Button>
              </a>
            </motion.div>

            <motion.p
              custom={4}
              initial="hidden"
              animate="visible"
              variants={variants}
              className="mt-5 text-xs text-muted-foreground"
            >
              Free up to {PRICING.freeSeatLimit} seats · No card required
            </motion.p>
          </div>

          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.75, delay: 0.18, ease: EASE_OUT_QUART }}
            className="lg:col-span-7 relative min-w-0"
          >
            <div className="relative mx-auto w-full max-w-[560px] lg:max-w-none lg:ml-auto lg:mr-[max(-2rem,calc(50%-50vw))] lg:pl-4">
              <div className="absolute inset-x-[8%] top-[10%] bottom-[8%] rounded-[2rem] bg-gradient-to-br from-brand-core/15 via-brand-cyan/10 to-transparent blur-3xl pointer-events-none" />
              <FloatingComposition size="hero" className="mx-auto" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function HeroAtmosphere() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      <div className="absolute -top-32 -left-28 h-[min(520px,80vw)] w-[min(520px,80vw)] rounded-full bg-brand-bright/25 blur-[130px]" />
      <div className="absolute top-[12%] -right-24 h-[min(480px,75vw)] w-[min(480px,75vw)] rounded-full bg-brand-cyan/20 blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[30%] h-[min(360px,55vw)] w-[min(560px,90vw)] rounded-full bg-brand-core/10 blur-[110px]" />
      <div
        className="absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(30,64,175,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(30,64,175,0.055) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage:
            "radial-gradient(ellipse 75% 70% at 50% 40%, black 0%, transparent 72%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 75% 70% at 50% 40%, black 0%, transparent 72%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
