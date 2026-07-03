"use client";

import type { MouseEvent } from "react";
import { motion } from "framer-motion";
import { Check, Database, FileUp, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { STARTING_DATA_OPTIONS } from "../lib/constants";
import type { StartingDataChoice } from "../lib/types";
import { NavButtons } from "./nav-buttons";

type StepStartingDataProps = {
  value: StartingDataChoice;
  onSelect: (choice: StartingDataChoice) => void;
  onBack: () => void;
  onNext: () => void;
};

const OPTION_ICONS: Record<StartingDataChoice, LucideIcon> = {
  clean: Database,
  sample: Sparkles,
  import: FileUp,
};

export function StepStartingData({ value, onSelect, onBack, onNext }: StepStartingDataProps) {
  function handleSelect(e: MouseEvent<HTMLButtonElement>) {
    const choice = e.currentTarget.dataset.choice as StartingDataChoice | undefined;
    if (choice) onSelect(choice);
  }

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted-foreground">
        Choose how you&apos;d like to start.
      </p>

      <div className="space-y-1.5">
        {STARTING_DATA_OPTIONS.map((option, i) => {
          const selected = value === option.id;
          const Icon = OPTION_ICONS[option.id];
          return (
            <motion.button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              data-choice={option.id}
              onClick={handleSelect}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.04 }}
              className={cn(
                "flex w-full items-center gap-2.5 p-2.5 rounded-lg border text-left transition-colors",
                selected
                  ? "border-blue-500 bg-blue-50"
                  : "border-border bg-card hover:border-blue-300 hover:bg-muted/40",
              )}
            >
              <Icon className={cn("h-3.5 w-3.5 shrink-0", selected ? "text-blue-600" : "text-muted-foreground")} />
              <div className="min-w-0 flex-1">
                <p className={cn("text-[13px] font-medium", selected ? "text-blue-700" : "text-foreground")}>
                  {option.label}
                </p>
                <p className="text-[11px] text-muted-foreground">{option.description}</p>
              </div>
              {selected && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
            </motion.button>
          );
        })}
      </div>

      <NavButtons onBack={onBack} onNext={onNext} />
    </div>
  );
}
