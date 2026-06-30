"use client";

import { motion } from "framer-motion";
import { ArrowRight, LayoutGrid, Loader2, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

type StepWelcomeProps = {
  onNext: () => void;
  onSkip: () => void;
  isSkipping?: boolean;
};

const HIGHLIGHTS = [
  { icon: Users, label: "Set up your team and roles" },
  { icon: LayoutGrid, label: "Choose the modules you need" },
  { icon: Zap, label: "Ready in under 5 minutes" },
];

export function StepWelcome({ onNext, onSkip, isSkipping = false }: StepWelcomeProps) {
  return (
    <div className="space-y-5 text-center">
      <div className="space-y-1.5">
        <p className="text-sm text-muted-foreground">
          Let&apos;s get your workspace configured for your team.
        </p>
      </div>

      <ul className="space-y-2 text-left">
        {HIGHLIGHTS.map(({ icon: Icon, label }, i) => (
          <motion.li
            key={label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07, duration: 0.2 }}
            className="flex items-center gap-2.5 text-[13px] text-muted-foreground"
          >
            <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center shrink-0">
              <Icon className="h-3.5 w-3.5 text-foreground" />
            </div>
            {label}
          </motion.li>
        ))}
      </ul>

      <div className="space-y-2 pt-1">
        <Button className="w-full h-9 text-sm gap-1.5" onClick={onNext} disabled={isSkipping}>
          Start Setup <ArrowRight className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          className="w-full h-9 text-sm text-muted-foreground hover:text-foreground"
          onClick={onSkip}
          disabled={isSkipping}
        >
          {isSkipping ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Setting up defaults…</>
          ) : (
            "I’ll set up later"
          )}
        </Button>
      </div>
    </div>
  );
}
