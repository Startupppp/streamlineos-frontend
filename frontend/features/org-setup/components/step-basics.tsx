"use client";

import { useMemo, type MouseEvent } from "react";
import { toast } from "sonner";
import { getAllCountries } from "countries-and-timezones";
import {
  TrendingUp, Users, Package, DollarSign, Headphones, LayoutGrid, Sparkles, Zap, Check,
  Monitor, Palette, ShoppingBag, Cog, Heart, BookOpen, Building, Building2, Utensils, Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { GOALS, INDUSTRIES, TEAM_SIZES } from "../lib/constants";
import type { WizardData } from "../lib/types";
import { NavButtons } from "./nav-buttons";
import { TruncatedText } from "@/components/ui/truncated-text";

type StepBasicsProps = {
  data: WizardData;
  patch: (updates: Partial<WizardData>) => void;
  onToggleGoal: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
};

const GOAL_ICONS: Record<string, LucideIcon> = {
  sales: TrendingUp, hr: Users, inventory: Package, finance: DollarSign,
  support: Headphones, projects: LayoutGrid, ai: Sparkles, everything: Zap,
};

const INDUSTRY_ICONS: Record<string, LucideIcon> = {
  "IT Services": Monitor, "Agency": Palette, "Retail": ShoppingBag, "Manufacturing": Cog,
  "Healthcare": Heart, "Education": BookOpen, "Construction": Building, "Real Estate": Building2,
  "Restaurant": Utensils, "Logistics": Truck,
};

const ALL_COUNTRIES = Object.values(getAllCountries())
  .map((c) => ({ name: c.name, timezone: c.timezones[0] ?? "UTC" }))
  .sort((a, b) => a.name.localeCompare(b.name));

const CHIP_BASE =
  "flex items-center gap-1.5 p-2 rounded-lg border text-left text-[11.5px] font-medium transition-colors press-scale";
const CHIP_SELECTED =
  "border-brand-core bg-brand-core/10 text-brand-deep dark:bg-brand-core/15 dark:text-brand-bright";
const CHIP_IDLE = "border-border bg-card text-foreground hover:border-brand-core/40";

export function StepBasics({ data, patch, onToggleGoal, onBack, onNext }: StepBasicsProps) {
  const customIndustry = INDUSTRIES.includes(data.industry) ? "" : data.industry;

  const selectedCountryTimezone = useMemo(
    () => ALL_COUNTRIES.find((c) => c.name === data.country)?.timezone ?? "",
    [data.country],
  );

  function handleGoalToggle(e: MouseEvent<HTMLButtonElement>) {
    const id = e.currentTarget.dataset.goalId;
    if (id) onToggleGoal(id);
  }

  function handleIndustrySelect(e: MouseEvent<HTMLButtonElement>) {
    const ind = e.currentTarget.dataset.industry;
    if (ind) patch({ industry: ind });
  }

  function handleCountrySelect(name: string) {
    const tz = ALL_COUNTRIES.find((c) => c.name === name)?.timezone ?? "";
    patch({ country: name, timezone: tz });
  }

  function handleNext() {
    if (data.goals.length === 0) {
      toast.error("Pick at least one goal");
      return;
    }
    if (!data.industry.trim()) {
      toast.error("Select or enter your industry");
      return;
    }
    if (!data.companyName.trim()) {
      toast.error("Enter your company name");
      return;
    }
    if (!data.teamSize) {
      toast.error("Select your team size");
      return;
    }
    onNext();
  }

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <p className="text-[12px] font-semibold text-foreground">What do you want to get done?</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {GOALS.map((goal) => {
            const selected = data.goals.includes(goal.id);
            const Icon = GOAL_ICONS[goal.id] ?? Zap;
            return (
              <button
                key={goal.id}
                type="button"
                role="checkbox"
                aria-checked={selected}
                data-goal-id={goal.id}
                onClick={handleGoalToggle}
                className={cn(CHIP_BASE, selected ? CHIP_SELECTED : CHIP_IDLE)}
              >
                <Icon className={cn("h-3.5 w-3.5 shrink-0", selected ? "text-brand-core" : "text-muted-foreground")} />
                <span className="min-w-0 flex-1">{goal.label}</span>
                {selected && <Check className="h-3 w-3 text-brand-core ml-auto shrink-0" />}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-[12px] font-semibold text-foreground">Industry</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {INDUSTRIES.map((ind) => {
            const selected = data.industry === ind;
            const Icon = INDUSTRY_ICONS[ind] ?? Building2;
            return (
              <button
                key={ind}
                type="button"
                role="radio"
                aria-checked={selected}
                data-industry={ind}
                onClick={handleIndustrySelect}
                className={cn(CHIP_BASE, selected ? CHIP_SELECTED : CHIP_IDLE)}
              >
                <Icon className={cn("h-3.5 w-3.5 shrink-0", selected ? "text-brand-core" : "text-muted-foreground")} />
                <TruncatedText text={ind} />
              </button>
            );
          })}
        </div>
        <Input
          value={customIndustry}
          onChange={(e) => patch({ industry: e.target.value })}
          placeholder="Other industry"
          aria-label="Other industry"
          className="text-[12.5px]"
        />
      </section>

      <section className="space-y-2">
        <p className="text-[12px] font-semibold text-foreground">Company</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="company-name" className="text-[12px]">Company name *</Label>
            <Input
              id="company-name"
              value={data.companyName}
              onChange={(e) => patch({ companyName: e.target.value })}
              placeholder="Acme Corp"
              className="text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[12px]">Team size *</Label>
            <Select onValueChange={(v) => patch({ teamSize: v })} value={data.teamSize}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                {TEAM_SIZES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[12px]">Country</Label>
            <Select onValueChange={handleCountrySelect} value={data.country}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px] min-w-[var(--radix-select-trigger-width)]">
                {ALL_COUNTRIES.map((c) => (
                  <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCountryTimezone && (
              <p className="text-[10.5px] text-muted-foreground">Timezone: {selectedCountryTimezone}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="org-phone" className="text-[12px]">Mobile number</Label>
            <PhoneInput
              id="org-phone"
              defaultCountry="IN"
              placeholder="Enter mobile number"
              maxLength={17}
              value={data.phone ?? ""}
              onChange={(v) => patch({ phone: v ?? "" })}
            />
          </div>
        </div>
        <p className="text-[10.5px] text-muted-foreground">You can change all of this later in Settings.</p>
      </section>

      <NavButtons onBack={onBack} onNext={handleNext} />
    </div>
  );
}
