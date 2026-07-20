"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Clock, LayoutGrid, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";

type StepWelcomeProps = {
  onNext: () => void;
  onSkip: () => void;
  isSkipping?: boolean;
};

const HIGHLIGHTS = [
  { icon: Users, label: "Set up your team and roles" },
  { icon: LayoutGrid, label: "Get modules recommended for your goals" },
  { icon: Zap, label: "Land on a workspace that's ready to use" },
];

export function StepWelcome({ onNext, onSkip, isSkipping = false }: StepWelcomeProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="space-y-5 text-center">
      <div className="space-y-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-core/25 bg-brand-core/5 px-2.5 py-1 text-[11px] font-medium text-brand-deep dark:text-brand-bright">
          <Clock className="h-3 w-3" /> Takes about 4 minutes
        </span>
        <p className="text-sm text-muted-foreground">
          A few quick questions, then your workspace is ready to run your business.
        </p>
      </div>

      <ul className="space-y-2 text-left">
        {HIGHLIGHTS.map(({ icon: Icon, label }, i) => (
          <motion.li
            key={label}
            initial={{ opacity: 0, x: reduceMotion ? 0 : -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07, duration: 0.2, ease: "easeOut" }}
            className="flex items-center gap-2.5 text-[13px] text-muted-foreground"
          >
            <div className="h-6 w-6 rounded-md bg-brand-core/10 flex items-center justify-center shrink-0">
              <Icon className="h-3.5 w-3.5 text-brand-core" />
            </div>
            {label}
          </motion.li>
        ))}
      </ul>

      <div className="space-y-2 pt-1">
        <Button className="w-full h-9 text-sm gap-1.5" onClick={onNext} disabled={isSkipping}>
          Start Setup <ArrowRight className="h-3.5 w-3.5" />
        </Button>
        <LoadingButton
          variant="ghost"
          className="w-full h-9 text-sm text-muted-foreground hover:text-foreground"
          onClick={onSkip}
          isPending={isSkipping}
          loadingText="Setting up defaults…"
        >
          I’ll set up later
        </LoadingButton>
      </div>
    </div>
  );
}
