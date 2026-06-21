"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { Star } from "lucide-react";
import { testimonials } from "../data/testimonials";

export function LandingTestimonials() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const rawX = useTransform(scrollYProgress, [0, 1], ["8%", "-58%"]);
  const x = useSpring(rawX, { stiffness: 90, damping: 26, mass: 0.5 });

  return (
    <section
      ref={ref}
      className="relative py-16 lg:py-24 overflow-hidden"
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[30%] left-[10%] h-[260px] w-[260px] rounded-full bg-blue-300/15 blur-[120px]" />
        <div className="absolute bottom-[20%] right-[10%] h-[260px] w-[260px] rounded-full bg-cyan-300/15 blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
          className="max-w-2xl text-center mx-auto mb-12"
        >
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em] leading-[1.05] text-slate-900">
            Don&apos;t take our word for it.{" "}
            <span className="text-blue-600">Take theirs.</span>
          </h2>
          <p className="mt-3 text-slate-500 text-base">Teams that ship faster with StreamlineOS.</p>
        </motion.div>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 w-16 sm:w-32 lg:w-48 z-10 pointer-events-none bg-gradient-to-r from-[#f6f8fc] via-[#f6f8fc]/80 to-transparent" />
        <div className="absolute inset-y-0 right-0 w-16 sm:w-32 lg:w-48 z-10 pointer-events-none bg-gradient-to-l from-[#f6f8fc] via-[#f6f8fc]/80 to-transparent" />

        <motion.div
          style={{ x }}
          className="flex gap-4 lg:gap-5 px-4 lg:px-8 will-change-transform"
        >
          {[...testimonials, ...testimonials].map((t, i) => (
            <TestimonialCard key={`${t.name}-${i}`} testimonial={t} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function TestimonialCard({
  testimonial,
}: {
  testimonial: (typeof testimonials)[number];
}) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as const }}
      className="group relative shrink-0 w-[300px] sm:w-[360px] lg:w-[400px] rounded-xl border border-slate-200/80 bg-white/90 backdrop-blur-sm p-6 hover:border-blue-300/70 hover:shadow-[0_20px_48px_-20px_rgba(30,64,175,0.20)] transition-all duration-300"
    >
      <div className="flex gap-0.5 mb-3.5">
        {Array.from({ length: 5 }).map((_, idx) => (
          <Star key={idx} className="h-3 w-3 fill-amber-400 text-amber-400" />
        ))}
      </div>
      <p className="text-[14px] text-slate-700 leading-relaxed mb-5 line-clamp-5">
        &ldquo;{testimonial.quote}&rdquo;
      </p>
      <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
        <span
          className="h-9 w-9 rounded-full inline-flex items-center justify-center text-[11px] font-bold text-white shrink-0 bg-blue-600"
        >
          {testimonial.initials}
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-slate-900 truncate">
            {testimonial.name}
          </p>
          <p className="text-[11px] text-slate-500 truncate">
            {testimonial.role}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
