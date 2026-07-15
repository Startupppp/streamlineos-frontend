"use client";

import { useMemo, useState, type MouseEvent } from "react";
import { toast } from "sonner";
import { getAllCountries } from "countries-and-timezones";
import {
  TrendingUp, Users, Package, DollarSign, Headphones, LayoutGrid, Sparkles, Zap, Check,
  Monitor, Palette, ShoppingBag, Cog, Heart, BookOpen, Building, Building2, Utensils, Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { GOALS, INDUSTRIES, TEAM_SIZES } from "../lib/constants";
import type { WizardData } from "../lib/types";
import { NavButtons } from "./nav-buttons";

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

const COUNTRY_OPTIONS = ALL_COUNTRIES.map((c) => ({
  value: c.name,
  label: c.name,
}));

const chipBase =
  "flex items-center gap-2 rounded-xl border p-2.5 text-left text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30";
const chipSelected = "border-blue-500 bg-blue-50 text-blue-700 shadow-sm";
const chipIdle = "border-slate-200 bg-white text-slate-900 hover:border-blue-300 hover:bg-blue-50/40";

function validateCompanyName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Enter your company name";
  if (trimmed.length < 2) return "Company name must be at least 2 characters";
  if (trimmed.length > 100) return "Company name must be at most 100 characters";
  if (!/[a-zA-Z0-9]/.test(trimmed)) {
    return "Company name must contain at least one letter or number";
  }
  if (/^[\W_]+$/.test(trimmed)) {
    return "Company name cannot consist of only special characters";
  }
  if (/\s{2,}/.test(trimmed)) {
    return "Company name cannot have multiple consecutive spaces";
  }
  return null;
}

export function StepBasics({ data, patch, onToggleGoal, onBack, onNext }: StepBasicsProps) {
  const [otherIndustry, setOtherIndustry] = useState("");
  const [companyNameError, setCompanyNameError] = useState<string | null>(null);

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

  function handleCompanyNameChange(value: string) {
    patch({ companyName: value });
    if (companyNameError) {
      setCompanyNameError(validateCompanyName(value));
    }
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
    const companyError = validateCompanyName(data.companyName);
    if (companyError) {
      setCompanyNameError(companyError);
      toast.error(companyError);
      return;
    }
    if (!data.teamSize) {
      toast.error("Select your team size");
      return;
    }
    patch({ companyName: data.companyName.trim() });
    setCompanyNameError(null);
    onNext();
  }

  return (
    <div className="space-y-5 sm:space-y-7">
      <section className="space-y-2.5 sm:space-y-3">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-foreground">What do you want to get done?</h2>
          <p className="text-xs text-muted-foreground">Select one or more goals. You can change these later.</p>
        </div>
        <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
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
                className={cn(chipBase, selected ? chipSelected : chipIdle)}
              >
                <Icon className={cn("h-4 w-4 shrink-0", selected ? "text-blue-600" : "text-slate-400")} />
                <span className="min-w-0 flex-1 leading-snug">{goal.label}</span>
                {selected && <Check className="h-3.5 w-3.5 shrink-0 text-blue-600" strokeWidth={2.5} />}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-2.5 sm:space-y-3">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-foreground">Industry</h2>
          <p className="text-xs text-muted-foreground">Helps us recommend the right setup for your work.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
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
                className={cn(chipBase, "text-[13px]", selected ? chipSelected : chipIdle)}
              >
                <Icon className={cn("h-3.5 w-3.5 shrink-0", selected ? "text-blue-600" : "text-slate-400")} />
                <span className="truncate">{ind}</span>
              </button>
            );
          })}
        </div>
        <Input
          value={otherIndustry}
          onChange={(e) => {
            setOtherIndustry(e.target.value);
            patch({ industry: e.target.value });
          }}
          placeholder="Or type another industry"
          className="h-10 text-sm"
        />
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-foreground">Company</h2>
          <p className="text-xs text-muted-foreground">You can change all of this later in Settings.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="company-name" className="text-xs font-medium text-foreground">
              Company name *
            </Label>
            <Input
              id="company-name"
              value={data.companyName}
              onChange={(e) => handleCompanyNameChange(e.target.value)}
              onBlur={() => {
                if (data.companyName.trim()) {
                  setCompanyNameError(validateCompanyName(data.companyName));
                }
              }}
              placeholder="Acme Corp"
              autoComplete="organization"
              aria-invalid={!!companyNameError}
              aria-describedby={companyNameError ? "company-name-error" : undefined}
              className="h-10 text-sm"
            />
            {companyNameError && (
              <p id="company-name-error" className="text-xs text-destructive" role="alert">
                {companyNameError}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">Team size *</Label>
            <Select onValueChange={(v) => patch({ teamSize: v })} value={data.teamSize}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                {TEAM_SIZES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 scroll-mt-6 sm:col-span-2">
            <Label className="text-xs font-medium text-foreground">Country</Label>
            <Combobox
              options={COUNTRY_OPTIONS}
              value={data.country ?? ""}
              onChange={handleCountrySelect}
              placeholder="Select country"
              searchPlaceholder="Search countries…"
              emptyText="No country found."
              className="h-10 w-full"
            />
            {selectedCountryTimezone && (
              <p className="pb-1 text-xs text-muted-foreground">
                Timezone: {selectedCountryTimezone}
              </p>
            )}
          </div>
        </div>
      </section>

      <NavButtons onBack={onBack} onNext={handleNext} />
    </div>
  );
}
