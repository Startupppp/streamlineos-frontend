"use client";

import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Monitor, Palette, ShoppingBag, Cog, Heart, BookOpen, Building, Building2, Utensils, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { INDUSTRIES } from "../_lib/constants";

type StepIndustryProps = {
  industry: string;
  onSelect: (industry: string) => void;
  onBack: () => void;
  onNext: () => void;
};

const INDUSTRY_ICONS: Record<string, LucideIcon> = {
  "IT Services": Monitor,
  "Agency": Palette,
  "Retail": ShoppingBag,
  "Manufacturing": Cog,
  "Healthcare": Heart,
  "Education": BookOpen,
  "Construction": Building,
  "Real Estate": Building2,
  "Restaurant": Utensils,
  "Logistics": Truck,
};

export function StepIndustry({ industry, onSelect, onBack, onNext }: StepIndustryProps) {
  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted-foreground">
        We&apos;ll load templates and workflows for your industry.
      </p>

      <div className="grid grid-cols-2 gap-1.5">
        {INDUSTRIES.map((ind, i) => {
          const selected = industry === ind;
          const Icon = INDUSTRY_ICONS[ind] ?? Building2;
          return (
            <motion.button
              key={ind}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(ind)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className={cn(
                "flex items-center gap-2 p-2.5 rounded-lg border text-left text-[13px] font-medium transition-colors",
                selected
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-border bg-card text-foreground hover:border-blue-300 hover:bg-muted/40",
              )}
            >
              <Icon className={cn("h-3.5 w-3.5 shrink-0", selected ? "text-blue-600" : "text-muted-foreground")} />
              <span className="truncate text-[12px]">{ind}</span>
            </motion.button>
          );
        })}
      </div>

      <div className="space-y-1.5">
        <Button
          type="button"
          onClick={onNext}
          disabled={!industry}
          className="w-full h-9 text-sm gap-1.5"
        >
          Continue <ArrowRight className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          className="w-full h-9 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
        </Button>
      </div>
    </div>
  );
}
