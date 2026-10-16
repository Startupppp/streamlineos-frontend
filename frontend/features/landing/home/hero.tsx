"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { Check } from "lucide-react";
import { REVEAL } from "./motion";
import { CONTAINER, StartLink } from "./section";
import heroImage from "@/public/landing/hero.webp";

const HEADLINE = ["All", "your", "business", "software,", "in", "one", "calm", "place"];

/** One customer moving through the company, told as three events. */
const EVENTS = [
  { label: "Deal won", detail: "Kestrel Foods, ₹18.4L" },
  { label: "Project created", detail: "Kestrel rollout, in 4 stages" },
  { label: "Invoice sent", detail: "₹6.13L for the first stage" },
];

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "16%"]);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1.02, 1.12]);
  const copyY = useTransform(scrollYProgress, [0, 1], ["0%", "-40%"]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);

  return (
    <section
      ref={ref}
      aria-labelledby="lp-hero-title"
      className="relative isolate flex min-h-dvh flex-col overflow-hidden"
    >
      <motion.div style={{ y: imageY, scale: imageScale }} className="absolute inset-0 -z-10">
        <Image
          src={heroImage}
          alt="An empty wooden desk with a vintage computer, alone on misty blue hills: work, in one calm place."
          fill
          priority
          placeholder="blur"
          sizes="100vw"
          className="object-cover object-[50%_70%]"
        />
      </motion.div>
      {/* Keeps the fog behind the headline pale enough for ink text at any crop. */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-2/3 bg-linear-to-b from-(--lp-canvas)/80 via-(--lp-canvas)/35 to-transparent"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-linear-to-t from-(--lp-canvas) to-transparent"
      />

      <motion.div
        style={{ y: copyY, opacity: copyOpacity }}
        className={`${CONTAINER} flex flex-col items-center pt-32 text-center sm:pt-36`}
      >
        <h1
          id="lp-hero-title"
          className="lp-display max-w-4xl text-balance text-5xl text-foreground sm:text-7xl lg:text-8xl"
        >
          {HEADLINE.map((word, i) => (
            <span key={word}>
              <span className="inline-block overflow-hidden pb-2 align-bottom">
              <motion.span
                className={`inline-block ${word === "calm" ? "italic text-(--lp-accent)" : ""}`}
                initial={{ y: "105%" }}
                animate={{ y: "0%" }}
                transition={{ ...REVEAL, delay: 0.04 + i * 0.03 }}
              >
                {word}
              </motion.span>
              </span>{" "}
            </span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...REVEAL, delay: 0.28 }}
          className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-(--lp-ink)/75 sm:text-lg"
        >
          HR, payroll, CRM, projects, invoicing and helpdesk in one workspace. One login, one bill, no copying data
          between apps.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...REVEAL, delay: 0.34 }}
          className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:gap-4"
        >
          <StartLink />
          <Link
            href="/#features"
            className="lp-glass inline-flex h-12 items-center rounded-full px-6 text-sm font-medium text-foreground transition-transform duration-200 ease-out hover:-translate-y-0.5"
          >
            See how it works
          </Link>
        </motion.div>
      </motion.div>

      <div className={`${CONTAINER} mt-auto pb-10 pt-16`}>
        <ol
          aria-label="One customer, three teams"
          className="mx-auto grid max-w-3xl gap-3 sm:grid-cols-3"
        >
          {EVENTS.map((event, i) => (
            <motion.li
              key={event.label}
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ ...REVEAL, delay: 0.5 + i * 0.16 }}
              className={`lp-glass flex items-center gap-3 rounded-2xl px-4 py-3 ${i > 0 ? "hidden sm:flex" : ""}`}
            >
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 18, delay: 0.62 + i * 0.16 }}
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-(--lp-accent) text-white"
              >
                <Check className="size-3.5" strokeWidth={2.5} aria-hidden />
              </motion.span>
              <span className="min-w-0 text-left">
                <span className="block text-sm font-medium text-foreground">{event.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{event.detail}</span>
              </span>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
