"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { AnimatedLogo } from "@/components/brand/animated-logo";
import { useAskOs } from "./ask-os-context";

export function AskOsLauncher() {
  const { open, toggle } = useAskOs();
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={toggle}
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduce ? { duration: 0 } : { duration: 0.25, ease: "easeOut" }}
      whileTap={reduce ? undefined : { scale: 0.98 }}
      aria-expanded={open}
      aria-label={open ? "Minimize Ask OS assistant" : "Open Ask OS assistant"}
      className={`hidden md:flex h-6 w-full items-center gap-1 bg-primary px-1.5 py-0 text-primary-foreground shadow-lg ring-1 ring-inset ring-primary/20 transition-colors hover:bg-primary/90 ${open ? "" : "rounded-tl-lg"}`}
    >
      <AnimatedLogo size={13} gradient />
      <span className="flex-1 text-left text-micro font-semibold leading-none tracking-wide">ASK OS</span>
      <ChevronDown className={`h-2.5 w-2.5 shrink-0 text-primary-foreground/70 transition-transform duration-200 ${open ? "rotate-180" : ""}`} aria-hidden />
    </motion.button>
  );
}
