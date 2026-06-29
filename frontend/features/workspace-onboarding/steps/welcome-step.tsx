"use client";

import { Building2, Clock, SkipForward } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";

interface WelcomeStepProps {
  onStart: () => void;
  onSkip: () => void;
}

export function WelcomeStep({ onStart, onSkip }: WelcomeStepProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center text-center space-y-8 py-12 px-4"
    >
      <motion.div variants={fadeUp}>
        <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto ring-1 ring-primary/20">
          <Building2 className="h-12 w-12 text-primary" />
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="space-y-3">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Welcome to StreamlineOS
        </h1>
        <p className="text-muted-foreground text-base md:text-lg max-w-sm mx-auto leading-relaxed">
          Let&apos;s get your workspace ready in about 3 minutes.
        </p>
      </motion.div>

      <motion.div variants={fadeUp} className="flex items-center gap-2 flex-wrap justify-center">
        <Badge variant="secondary" className="gap-1.5 px-3 py-1">
          <Clock className="h-3 w-3" />
          ~3 min
        </Badge>
        <Badge variant="outline" className="gap-1.5 px-3 py-1">
          <SkipForward className="h-3 w-3" />
          Skippable
        </Badge>
      </motion.div>

      <motion.div variants={fadeUp} className="flex flex-col items-center gap-3 w-full max-w-xs">
        <Button onClick={onStart} size="lg" className="w-full h-12 text-base">
          Get Started
        </Button>
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
        >
          Skip setup
        </button>
      </motion.div>
    </motion.div>
  );
}
