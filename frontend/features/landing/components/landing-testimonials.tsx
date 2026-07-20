"use client";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useReducedMotion,
} from "framer-motion";
import { Star } from "lucide-react";
import { testimonials } from "../data/testimonials";

export function LandingTestimonials() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const rawX = useTransform(scrollYProgress, [0, 1], ["4%", "-48%"]);
  const x = useSpring(rawX, { stiffness: 90, damping: 26, mass: 0.5 });

  return (
    <section ref={ref} className="relative py-14 sm:py-16 lg:py-24 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-[30%] left-[10%] h-[min(260px,50vw)] w-[min(260px,50vw)] rounded-full bg-brand-bright/20 blur-[120px]" />
        <div className="absolute bottom-[20%] right-[10%] h-[min(260px,50vw)] w-[min(260px,50vw)] rounded-full bg-brand-cyan/15 blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] as const }}
          className="max-w-2xl text-center mx-auto mb-8 sm:mb-12"
        >
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em] leading-[1.05] text-slate-900 text-balance">
            Don&apos;t take our word for it.{" "}
            <span className="text-brand-core">Take theirs.</span>
          </h2>
          <p className="mt-3 text-slate-500 text-sm sm:text-base">
            Teams that ship faster with StreamlineOS.
          </p>
        </motion.div>
      </div>

      <div className="lg:hidden">
        <div
          className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory px-4 sm:px-6 pb-2 scrollbar-hide"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {testimonials.map((t) => (
            <div key={t.name} className="snap-center shrink-0 first:ml-0">
              <TestimonialCard testimonial={t} reduce={reduce} />
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-[11px] text-slate-400 px-4">
          Swipe to see more
        </p>
      </div>

      <div className="relative hidden lg:block">
        <div className="absolute inset-y-0 left-0 w-16 sm:w-32 lg:w-48 z-10 pointer-events-none bg-gradient-to-r from-[#f4f7fc] via-[#f4f7fc]/85 to-transparent" />
        <div className="absolute inset-y-0 right-0 w-16 sm:w-32 lg:w-48 z-10 pointer-events-none bg-gradient-to-l from-[#f4f7fc] via-[#f4f7fc]/85 to-transparent" />

        <motion.div
          style={reduce ? undefined : { x }}
          className="flex gap-4 lg:gap-5 px-4 lg:px-8 will-change-transform"
        >
          {[...testimonials, ...testimonials].map((t, i) => (
            <TestimonialCard
              key={`${t.name}-${i}`}
              testimonial={t}
              reduce={reduce}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function TestimonialCard({
  testimonial,
  reduce,
}: {
  testimonial: (typeof testimonials)[number];
  reduce: boolean | null;
}) {
  return (
    <motion.div
      whileHover={reduce ? undefined : { y: -4, scale: 1.01 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as const }}
      className="group relative shrink-0 w-[min(300px,calc(100vw-2.5rem))] sm:w-[360px] lg:w-[400px] rounded-xl border border-slate-200/80 bg-white/90 backdrop-blur-sm p-5 sm:p-6 hover:border-brand-core/35 hover:shadow-[0_20px_48px_-20px_rgba(30,64,175,0.20)] transition-all duration-300"
    >
      <div className="flex gap-0.5 mb-3.5">
        {Array.from({ length: 5 }).map((_, idx) => (
          <Star key={idx} className="h-3 w-3 fill-amber-400 text-amber-400" />
        ))}
      </div>
      <p className="text-[13px] sm:text-[14px] text-slate-700 leading-relaxed mb-5 line-clamp-5">
        &ldquo;{testimonial.quote}&rdquo;
      </p>
      <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
        <span className="h-9 w-9 rounded-full inline-flex items-center justify-center text-[11px] font-bold text-white shrink-0 bg-brand-core">
          {testimonial.initials}
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-slate-900 truncate">
            {testimonial.name}
          </p>
          <p className="text-[11px] text-slate-500 truncate">{testimonial.role}</p>
        </div>
      </div>
    </motion.div>
  );
}
