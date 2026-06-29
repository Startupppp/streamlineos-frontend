"use client";

import { useState } from "react";
import {
  Monitor, Megaphone, ShoppingBag, Factory, Heart,
  GraduationCap, HardHat, Home, UtensilsCrossed, Truck,
  ChevronLeft,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Industry {
  id: string;
  label: string;
  icon: LucideIcon;
}

const INDUSTRIES: Industry[] = [
  { id: "it-services", label: "IT Services", icon: Monitor },
  { id: "agency", label: "Agency", icon: Megaphone },
  { id: "retail", label: "Retail", icon: ShoppingBag },
  { id: "manufacturing", label: "Manufacturing", icon: Factory },
  { id: "healthcare", label: "Healthcare", icon: Heart },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "construction", label: "Construction", icon: HardHat },
  { id: "real-estate", label: "Real Estate", icon: Home },
  { id: "restaurant", label: "Restaurant", icon: UtensilsCrossed },
  { id: "logistics", label: "Logistics", icon: Truck },
];

interface IndustryStepProps {
  onNext: (industry: string) => void;
  onBack: () => void;
  defaultIndustry?: string;
}

export function IndustryStep({ onNext, onBack, defaultIndustry }: IndustryStepProps) {
  const [selected, setSelected] = useState<string>(defaultIndustry ?? "");

  function handleSelect(id: string) {
    setSelected(id);
    setTimeout(() => {
      onNext(id);
    }, 300);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold">What industry are you in?</h2>
        <p className="text-sm text-muted-foreground">
          We&apos;ll pre-configure your workspace with industry-specific defaults.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {INDUSTRIES.map((industry) => {
          const Icon = industry.icon;
          const isSelected = selected === industry.id;
          return (
            <button
              key={industry.id}
              type="button"
              onClick={() => handleSelect(industry.id)}
              className={cn(
                "flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 text-center transition-all duration-150",
                "hover:border-primary/50 hover:bg-primary/5",
                isSelected
                  ? "border-primary bg-primary/10 scale-[0.97]"
                  : "border-border bg-card",
              )}
              aria-pressed={isSelected}
            >
              <Icon
                className={cn(
                  "h-6 w-6",
                  isSelected ? "text-primary" : "text-muted-foreground",
                )}
              />
              <span
                className={cn(
                  "text-xs font-medium leading-tight",
                  isSelected ? "text-primary" : "text-foreground",
                )}
              >
                {industry.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="pt-2">
        <Button variant="outline" onClick={onBack} className="w-full sm:w-auto">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>
    </div>
  );
}
