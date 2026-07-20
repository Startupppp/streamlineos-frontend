"use client";

import { useMemo, useState, type MouseEvent } from "react";
import { getAllCountries } from "countries-and-timezones";
import {
  TrendingUp, Users, Package, DollarSign, Headphones, LayoutGrid, Sparkles, Zap, Check,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { GOALS, INDUSTRIES, INDUSTRY_TEMPLATE_HINTS, TEAM_SIZES } from "../lib/constants";
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

const ALL_COUNTRIES = Object.values(getAllCountries())
  .map((c) => ({ name: c.name, timezone: c.timezones[0] ?? "UTC" }))
  .sort((a, b) => a.name.localeCompare(b.name));

const OTHER_INDUSTRY = "__other";

const CHIP_BASE =
  "flex items-center gap-1.5 p-2 rounded-lg border text-left text-xs font-medium transition-colors press-scale";
const CHIP_SELECTED =
  "border-brand-core bg-brand-core/10 text-brand-deep dark:bg-brand-core/15 dark:text-brand-bright";
const CHIP_IDLE = "border-border bg-card text-foreground hover:border-brand-core/40";

function InlineError({ id, message }: { id: string; message: string | null }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-xs text-destructive">
      {message}
    </p>
  );
}

export function StepBasics({ data, patch, onToggleGoal, onBack, onNext }: StepBasicsProps) {
  const [attempted, setAttempted] = useState(false);
  const [otherSelected, setOtherSelected] = useState(
    () => data.industry.trim() !== "" && !INDUSTRIES.includes(data.industry),
  );

  const selectedCountryTimezone = useMemo(
    () => ALL_COUNTRIES.find((c) => c.name === data.country)?.timezone ?? "",
    [data.country],
  );

  const industrySelectValue = otherSelected
    ? OTHER_INDUSTRY
    : INDUSTRIES.includes(data.industry)
      ? data.industry
      : undefined;
  const industryHint = INDUSTRY_TEMPLATE_HINTS[data.industry];

  const errors = {
    goals: attempted && data.goals.length === 0 ? "Select at least one goal." : null,
    industry: attempted && !data.industry.trim() ? "Select or enter your industry." : null,
    companyName: attempted && !data.companyName.trim() ? "Enter your company name." : null,
    teamSize: attempted && !data.teamSize ? "Select your team size." : null,
  };

  function handleGoalToggle(e: MouseEvent<HTMLButtonElement>) {
    const id = e.currentTarget.dataset.goalId;
    if (id) onToggleGoal(id);
  }

  function handleIndustrySelect(value: string) {
    if (value === OTHER_INDUSTRY) {
      setOtherSelected(true);
      if (INDUSTRIES.includes(data.industry)) patch({ industry: "" });
      return;
    }
    setOtherSelected(false);
    patch({ industry: value });
  }

  function handleCountrySelect(name: string) {
    const tz = ALL_COUNTRIES.find((c) => c.name === name)?.timezone ?? "";
    patch({ country: name, timezone: tz });
  }

  function handleNext() {
    const valid =
      data.goals.length > 0 &&
      data.industry.trim() !== "" &&
      data.companyName.trim() !== "" &&
      data.teamSize !== "";
    if (!valid) {
      setAttempted(true);
      return;
    }
    onNext();
  }

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <p className="text-xs font-semibold text-foreground">What do you want to get done? *</p>
        <div
          role="group"
          aria-label="What do you want to get done?"
          className="grid grid-cols-2 sm:grid-cols-3 gap-1.5"
        >
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
                <Icon className={cn("h-3.5 w-3.5 shrink-0", selected ? "text-brand-core" : "text-muted-foreground")} aria-hidden />
                <span className="min-w-0 flex-1">{goal.label}</span>
                {selected && <Check className="h-3 w-3 text-brand-core ml-auto shrink-0" aria-hidden />}
              </button>
            );
          })}
        </div>
        <InlineError id="goals-error" message={errors.goals} />
      </section>

      <section className="space-y-2">
        <Label htmlFor="industry-select" className="text-xs font-semibold text-foreground">
          Industry *
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Select value={industrySelectValue} onValueChange={handleIndustrySelect}>
            <SelectTrigger
              id="industry-select"
              className="text-sm"
              aria-invalid={!!errors.industry}
              aria-describedby={errors.industry ? "industry-error" : undefined}
            >
              <SelectValue placeholder="Select your industry" />
            </SelectTrigger>
            <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
              {INDUSTRIES.map((ind) => (
                <SelectItem key={ind} value={ind}>{ind}</SelectItem>
              ))}
              <SelectItem value={OTHER_INDUSTRY}>Other…</SelectItem>
            </SelectContent>
          </Select>
          {otherSelected && (
            <Input
              value={data.industry}
              onChange={(e) => patch({ industry: e.target.value })}
              placeholder="Your industry"
              aria-label="Your industry"
              className="text-sm"
            />
          )}
        </div>
        {industryHint && (
          <p className="text-xs text-muted-foreground">We&apos;ll set up: {industryHint}</p>
        )}
        <InlineError id="industry-error" message={errors.industry} />
      </section>

      <section className="space-y-2">
        <p className="text-xs font-semibold text-foreground">Company</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="company-name" className="text-xs">Company name *</Label>
            <Input
              id="company-name"
              value={data.companyName}
              onChange={(e) => patch({ companyName: e.target.value })}
              placeholder="Acme Corp"
              className="text-sm"
              aria-invalid={!!errors.companyName}
              aria-describedby={errors.companyName ? "company-name-error" : undefined}
            />
            <InlineError id="company-name-error" message={errors.companyName} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Team size *</Label>
            <Select onValueChange={(v) => patch({ teamSize: v })} value={data.teamSize}>
              <SelectTrigger
                className="text-sm"
                aria-invalid={!!errors.teamSize}
                aria-describedby={errors.teamSize ? "team-size-error" : undefined}
              >
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                {TEAM_SIZES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <InlineError id="team-size-error" message={errors.teamSize} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Country</Label>
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
              <p className="text-xs text-muted-foreground">Timezone: {selectedCountryTimezone}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="org-phone" className="text-xs">Mobile number</Label>
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
        <p className="text-xs text-muted-foreground">You can change all of this later in Settings.</p>
      </section>

      <NavButtons onBack={onBack} onNext={handleNext} />
    </div>
  );
}
