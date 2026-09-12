"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useMotionVariants } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";

export function AuthStatusShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { staggerContainer } = useMotionVariants();

  return (
    <motion.div
      className={cn("w-full max-w-sm", className)}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  );
}

export function AuthStatusSection({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { fadeUp } = useMotionVariants();

  return (
    <motion.div variants={fadeUp} className={className}>
      {children}
    </motion.div>
  );
}

export function SuccessIcon() {
  const { scaleIn } = useMotionVariants();

  return (
    <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center">
      <div
        className="absolute inset-0 rounded-full bg-status-success-surface"
        aria-hidden="true"
      />
      <motion.div
        variants={scaleIn}
        className="relative flex h-14 w-14 items-center justify-center rounded-full border border-status-success-rule bg-card shadow-sm"
      >
        <CheckCircle2
          className="w-7 text-status-success-ink"
          strokeWidth={1.75}
          aria-hidden="true"
        />
      </motion.div>
    </div>
  );
}

export function SetupProgress() {
  const [progress, setProgress] = useState(12);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 88) return prev;
        return Math.min(88, prev + 4 + Math.random() * 6);
      });
    }, 450);

    return () => clearInterval(timer);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-xl border border-border bg-card p-4 space-y-3 text-left shadow-sm"
    >
      <div className="flex items-center gap-2.5">
        <Loader2
          className="h-3.5 w-3.5 animate-spin text-status-info-ink shrink-0"
          aria-hidden="true"
        />
        <p className="text-sm text-muted-foreground">Setting up your account…</p>
      </div>
      <Progress value={progress} className="h-1 bg-muted [&>div]:bg-status-info-fill" />
    </div>
  );
}

export function LoadingCard() {
  return (
    <div className="w-full max-w-sm text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-muted/60">
        <Loader2
          className="h-6 w-6 animate-spin text-status-info-ink"
          aria-hidden="true"
        />
      </div>
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  );
}

