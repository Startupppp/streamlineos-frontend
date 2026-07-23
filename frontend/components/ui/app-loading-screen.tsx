"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AppLoadingScreenProps {
  className?: string;
  label?: string;
}

export function AppLoadingScreen({
  className,
  label = "Loading…",
}: AppLoadingScreenProps) {
  const reduce = useReducedMotion();

  return (
    <div
      className={cn(
        "flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-4",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <motion.div
        className="overflow-hidden rounded-xl"
        initial={reduce ? { opacity: 0.6 } : { opacity: 0.5, scale: 0.96 }}
        animate={
          reduce
            ? { opacity: [0.6, 1, 0.6] }
            : { opacity: [0.5, 1, 0.5], scale: [0.96, 1, 0.96] }
        }
        transition={{ duration: 1.4, ease: "easeInOut", repeat: Infinity }}
      >
        <Image
          src="/logo.svg"
          alt="StreamlineOS"
          width={48}
          height={48}
          priority
          className="h-12 w-12"
        />
      </motion.div>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
}
