"use client";

import type { MouseEvent } from "react";
import { motion } from "framer-motion";
import { Check, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { MODULE_CATALOG } from "../lib/constants";
import { NavButtons } from "./nav-buttons";

type StepModulesProps = {
  modules: string[];
  recommendedReasons?: Record<string, string>;
  onToggle: (moduleKey: string) => void;
  onBack: () => void;
  onNext: () => void;
};

export function StepModules({ modules, recommendedReasons, onToggle, onBack, onNext }: StepModulesProps) {
  function handleToggle(e: MouseEvent<HTMLButtonElement>) {
    const key = e.currentTarget.dataset.moduleKey;
    if (key) onToggle(key);
  }

  const catalogEntries = Object.entries(MODULE_CATALOG);

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted-foreground">
        Based on your goals, we recommend enabling these. You can change this anytime.
      </p>

      <div className="grid grid-cols-2 gap-1.5">
        {catalogEntries.map(([key, meta], i) => {
          const selected = modules.includes(key);
          const reason = recommendedReasons?.[key];
          return (
            <motion.button
              key={key}
              type="button"
              role="checkbox"
              aria-checked={selected}
              data-module-key={key}
              onClick={handleToggle}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.04 }}
              title={reason}
              className={cn(
                "flex items-start gap-2 p-2.5 rounded-lg border text-left transition-colors",
                selected
                  ? "border-blue-500 bg-blue-50"
                  : "border-border bg-card hover:border-blue-300 hover:bg-muted/40",
              )}
            >
              <LayoutGrid className={cn("h-3.5 w-3.5 shrink-0 mt-0.5", selected ? "text-blue-600" : "text-muted-foreground")} />
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className={cn("text-[13px] font-medium truncate", selected ? "text-blue-700" : "text-foreground")}>
                    {meta.label}
                  </span>
                  {selected && <Check className="h-3 w-3 text-blue-600 shrink-0" />}
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{meta.description}</p>
              </div>
            </motion.button>
          );
        })}
      </div>

      <NavButtons onBack={onBack} onNext={onNext} nextDisabled={modules.length === 0} />
    </div>
  );
}
