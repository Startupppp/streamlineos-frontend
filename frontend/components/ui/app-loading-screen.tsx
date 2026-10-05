"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { AppLoadingStalled } from "@/components/ui/app-loading-stalled";
import {
  DEFAULT_STALLED_AFTER_MS,
  useStalledAfter,
} from "@/hooks/common/use-stalled-after";
import { cn } from "@/lib/utils";

interface AppLoadingScreenProps {
  className?: string;
  label?: string;
  stalledAfterMs?: number;
}

export { DEFAULT_STALLED_AFTER_MS };

function TypingLabel({ label, reduce }: { label: string; reduce: boolean }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const timer = window.setInterval(() => {
      setStep((current) => current >= label.length + 10 ? 0 : current + 1);
    }, 100);
    return () => window.clearInterval(timer);
  }, [label, reduce]);

  return (
    <p className="mt-10 text-sm font-medium text-muted-foreground">
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" data-testid="loading-typed-label" className="inline-block text-left font-mono" style={{ width: `${label.length + 1}ch` }}>
        {reduce ? label : label.slice(0, Math.min(step, label.length))}
        <motion.span
          className="ml-0.5 inline-block h-4 w-px bg-foreground align-[-0.2em]"
          animate={reduce ? undefined : { opacity: [1, 0, 1] }}
          transition={reduce ? undefined : { duration: 0.4, repeat: Infinity, repeatDelay: 0.2 }}
        />
      </span>
    </p>
  );
}

export function AppLoadingScreen({
  className,
  label = "Loading",
  stalledAfterMs = DEFAULT_STALLED_AFTER_MS,
}: AppLoadingScreenProps) {
  const reduce = useReducedMotion() === true;
  const stalled = useStalledAfter(true, stalledAfterMs);

  if (stalled) return <AppLoadingStalled className={className} />;

  return (
    <div
      className={cn(
        "flex min-h-[60vh] flex-1 items-center justify-center bg-background px-6",
        className,
      )}
      data-app-loading-screen
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center">
        <motion.div
          animate={reduce ? undefined : { scale: [1, 1.04, 1] }}
          transition={reduce ? undefined : { duration: 0.4, repeat: Infinity, repeatDelay: 1.2 }}
        >
          <Image
            src="/logo.svg"
            alt="StreamlineOS"
            width={64}
            height={64}
            priority
            className="h-16 w-16 rounded-xl"
          />
        </motion.div>
        <TypingLabel label={label} reduce={reduce} />
      </div>
    </div>
  );
}
