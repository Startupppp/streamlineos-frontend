"use client";

import { useCallback, useMemo, useState, type MouseEvent } from "react";
import { getAllCountries } from "countries-and-timezones";
import {
  TrendingUpIcon,
  UsersIcon,
  BoxesIcon,
  BadgeDollarIcon,
  HeadphonesIcon,
  LayoutGridIcon,
  SparklesIcon,
  ZapIcon,
} from "@animateicons/react/lucide";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ZodIssue } from "zod";
import { basicsStepSchema } from "../lib/basics-schema";
import { GOALS, INDUSTRIES, INDUSTRY_TEMPLATE_HINTS, TEAM_SIZES } from "../lib/constants";
import type { WizardData } from "../lib/types";
import { GoalChip } from "./goal-chip";
import { NavButtons } from "./nav-buttons";
import { StepBody } from "./step-body";

type StepBasicsProps = {
  data: WizardData;
  patch: (updates: Partial<WizardData>) => void;
  onToggleGoal: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
};

type AnimatedIcon = typeof TrendingUpIcon;

const GOAL_ICONS: Record<string, AnimatedIcon> = {
  sales: TrendingUpIcon,
  hr: UsersIcon,
  inventory: BoxesIcon,
  finance: BadgeDollarIcon,
  support: HeadphonesIcon,
  projects: LayoutGridIcon,
  ai: SparklesIcon,
  everything: ZapIcon,
};

const ALL_COUNTRIES = Object.values(getAllCountries())
  .map((c) => ({ name: c.name, timezone: c.timezones[0] ?? "UTC" }))
  .sort((a, b) => a.name.localeCompare(b.name));

const OTHER_INDUSTRY = "__other";

function InlineError({ id, message }: { id: string; message: string | null }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-xs text-destructive">
      {message}
    </p>
  );
}

function fieldError(attempted: boolean, issues: ZodIssue[], key: string): string | null {
  if (!attempted) return null;
  return issues.find((issue) => issue.path[0] === key)?.message ?? null;
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

  const parsed = useMemo(
    () =>
      basicsStepSchema.safeParse({
        goals: data.goals,
        industry: data.industry,
        companyName: data.companyName,
        teamSize: data.teamSize,
        phone: data.phone,
      }),
    [data.goals, data.industry, data.companyName, data.teamSize, data.phone],
  );

  const issues = parsed.success ? [] : parsed.error.issues;
  const errors = {
    goals: fieldError(attempted, issues, "goals"),
    industry: fieldError(attempted, issues, "industry"),
    companyName: fieldError(attempted, issues, "companyName"),
    teamSize: fieldError(attempted, issues, "teamSize"),
    phone: fieldError(attempted, issues, "phone"),
  };

  const handleGoalToggle = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      const id = e.currentTarget.dataset.goalId;
      if (id) onToggleGoal(id);
    },
    [onToggleGoal],
  );

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

  function handlePhoneChange(value: string) {
    patch({ phone: value });
  }

  function handleNext() {
    if (!parsed.success) {
      setAttempted(true);
      return;
    }
    onNext();
  }

  return (
    <StepBody footer={<NavButtons onBack={onBack} onNext={handleNext} />}>
      <section className="space-y-2">
        <p className="text-[13px] font-semibold text-foreground">What do you want to get done? *</p>
        <div
          role="group"
          aria-label="What do you want to get done?"
          className="grid grid-cols-2 gap-1.5 sm:grid-cols-3"
        >
          {GOALS.map((goal) => {
            const selected = data.goals.includes(goal.id);
            const Icon = GOAL_ICONS[goal.id] ?? ZapIcon;
            return (
              <GoalChip
                key={goal.id}
                goalId={goal.id}
                label={goal.label}
                selected={selected}
                Icon={Icon}
                onToggle={handleGoalToggle}
              />
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          We&apos;ll enable matching modules (Chat &amp; Knowledge always included). You can change
          modules later in Settings.
        </p>
        <InlineError id="goals-error" message={errors.goals} />
      </section>

      <section className="space-y-2">
        <Label htmlFor="industry-select" className="text-[13px] font-semibold text-foreground">
          Industry *
        </Label>
        <div className={otherSelected ? "grid grid-cols-1 gap-2 sm:grid-cols-2" : "w-full"}>
          <Select value={industrySelectValue} onValueChange={handleIndustrySelect}>
            <SelectTrigger
              id="industry-select"
              className="w-full text-sm"
              aria-invalid={!!errors.industry}
              aria-describedby={errors.industry ? "industry-error" : undefined}
            >
              <SelectValue placeholder="Select your industry" />
            </SelectTrigger>
            <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
              {INDUSTRIES.map((ind) => (
                <SelectItem key={ind} value={ind}>
                  {ind}
                </SelectItem>
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
        <p className="text-[13px] font-semibold text-foreground">Company</p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="company-name" className="text-xs">
              Company name *
            </Label>
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
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
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
                  <SelectItem key={c.name} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCountryTimezone && (
              <p className="text-xs text-muted-foreground">Timezone: {selectedCountryTimezone}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="org-phone" className="text-xs">
              Mobile number *
            </Label>
            <PhoneInput
              id="org-phone"
              defaultCountry="IN"
              placeholder="Enter mobile number"
              maxLength={17}
              value={data.phone}
              onChange={handlePhoneChange}
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? "org-phone-error" : undefined}
            />
            <InlineError id="org-phone-error" message={errors.phone} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">You can change all of this later in Settings.</p>
      </section>
    </StepBody>
  );
}
