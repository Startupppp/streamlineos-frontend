"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AppLoadingScreenProps {
  className?: string;
  label?: string;
}

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export function AppLoadingScreen({
  className,
  label = "Loading",
}: AppLoadingScreenProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <div
        className={cn(
          "relative flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-5",
          className,
        )}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <motion.div
          className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm"
          animate={{ opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 1.8, ease: "easeOut", repeat: Infinity }}
        >
          <Image
            src="/logo.svg"
            alt="StreamlineOS"
            width={56}
            height={56}
            priority
            className="h-14 w-14"
          />
        </motion.div>
        <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
          {label}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex min-h-[60vh] flex-1 flex-col items-center justify-center overflow-hidden",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_srgb,var(--foreground)_6%,transparent)_0%,transparent_70%)]"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{
          opacity: [0.2, 0.35, 0.75, 0.25],
          scale: [0.94, 0.98, 1.08, 0.95],
        }}
        transition={{
          duration: 3.2,
          ease: EASE_OUT,
          times: [0, 0.4, 0.82, 1],
          repeat: Infinity,
        }}
      />

      <div className="relative flex flex-col items-center gap-6">
        <div className="relative grid h-32 w-32 place-items-center">
          <motion.svg
            aria-hidden
            viewBox="0 0 96 96"
            className="absolute inset-0 h-full w-full text-foreground/20"
            initial={{ opacity: 0, rotate: 0 }}
            animate={{
              opacity: [0.15, 0.25, 0.55, 0.2],
              rotate: [0, 40, 220, 360],
            }}
            transition={{
              duration: 3.4,
              ease: EASE_OUT,
              times: [0, 0.35, 0.78, 1],
              repeat: Infinity,
            }}
          >
            <circle
              cx="48"
              cy="48"
              r="43"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.8"
              strokeDasharray="1.5 6"
            />
          </motion.svg>

          <motion.svg
            aria-hidden
            viewBox="0 0 96 96"
            className="absolute inset-0 h-full w-full text-foreground/35"
            initial={{ opacity: 0, rotate: 0 }}
            animate={{
              opacity: [0.1, 0.2, 0.65, 0.15],
              rotate: [0, -30, -200, -360],
            }}
            transition={{
              duration: 3.4,
              ease: EASE_OUT,
              times: [0, 0.38, 0.8, 1],
              repeat: Infinity,
              delay: 0.12,
            }}
          >
            {Array.from({ length: 8 }, (_, i) => {
              const angle = (i * 45 * Math.PI) / 180;
              const x1 = 48 + Math.cos(angle) * 34;
              const y1 = 48 + Math.sin(angle) * 34;
              const x2 = 48 + Math.cos(angle) * 39;
              const y2 = 48 + Math.sin(angle) * 39;
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="currentColor"
                  strokeWidth={i % 2 === 0 ? 1.3 : 0.7}
                  strokeLinecap="round"
                />
              );
            })}
          </motion.svg>

          <motion.div
            className="relative z-10 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_16px_36px_-26px_rgba(11,18,32,0.5)]"
            initial={{ opacity: 0, scale: 0.9, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.55, ease: EASE_OUT }}
          >
            <motion.div
              animate={{
                scale: [1, 1, 1.045, 1],
                y: [0, 0, -2, 0],
              }}
              transition={{
                duration: 2.8,
                ease: EASE_OUT,
                times: [0, 0.45, 0.82, 1],
                repeat: Infinity,
                delay: 0.55,
              }}
            >
              <Image
                src="/logo.svg"
                alt="StreamlineOS"
                width={56}
                height={56}
                priority
                className="relative z-[1] h-14 w-14"
              />
            </motion.div>
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-r from-transparent via-background/45 to-transparent"
              initial={{ x: "-130%", opacity: 0 }}
              animate={{
                x: ["-130%", "-40%", "130%"],
                opacity: [0, 0.35, 0.8, 0],
              }}
              transition={{
                duration: 2.6,
                ease: EASE_OUT,
                times: [0, 0.4, 0.85, 1],
                repeat: Infinity,
                delay: 0.7,
              }}
            />
          </motion.div>

          <motion.span
            aria-hidden
            className="absolute left-1/2 top-1/2 z-0 h-[4.5rem] w-[4.5rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-foreground/15"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{
              scale: [0.9, 0.95, 1.55],
              opacity: [0, 0.15, 0.5, 0],
            }}
            transition={{
              duration: 2.6,
              ease: EASE_OUT,
              times: [0, 0.4, 0.78, 1],
              repeat: Infinity,
              delay: 0.9,
            }}
          />
        </div>

        <div className="flex w-40 flex-col items-center gap-2.5">
          <motion.p
            className="text-xs font-semibold tracking-[0.26em] text-foreground/80 uppercase"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.15 }}
          >
            {label}
          </motion.p>

          <div className="relative h-1 w-full overflow-hidden rounded-full bg-border/70">
            <motion.span
              aria-hidden
              className="absolute inset-y-0 left-0 w-2/5 rounded-full bg-foreground will-change-transform"
              initial={{ x: "-100%", opacity: 0.35 }}
              animate={{
                x: ["-100%", "-30%", "160%"],
                opacity: [0.25, 0.45, 1, 0.2],
              }}
              transition={{
                duration: 1.7,
                ease: EASE_OUT,
                times: [0, 0.35, 0.88, 1],
                repeat: Infinity,
              }}
            />
          </div>

          <motion.span
            className="text-[10px] font-medium tracking-[0.2em] text-muted-foreground uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.25, 0.4, 0.95, 0.3] }}
            transition={{
              duration: 2.8,
              ease: EASE_OUT,
              times: [0, 0.4, 0.85, 1],
              repeat: Infinity,
              delay: 0.35,
            }}
          >
            Syncing organization
          </motion.span>
        </div>
      </div>
    </div>
  );
}
