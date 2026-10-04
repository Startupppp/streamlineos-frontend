"use client";

import { useCallback, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { ZodIssue } from "zod";
import {
  workspaceStepSchema,
  DISPLAY_NAME_MAX_LENGTH,
  COMPANY_NAME_MAX_LENGTH,
} from "../lib/basics-schema";
import { TEAM_SIZES, INDUSTRIES } from "../lib/constants";
import type { WizardData } from "../lib/wizard-data-schema";
import { NavButtons } from "./nav-buttons";
import { StepBody } from "./step-body";

type StepWorkspaceProps = {
  data: WizardData;
  patch: (updates: Partial<WizardData>) => void;
  onBack: () => void;
  onNext: () => void;
};

function fieldError(
  attempted: boolean,
  issues: ZodIssue[],
  key: string,
): string | null {
  if (!attempted) return null;
  return issues.find((issue) => issue.path[0] === key)?.message ?? null;
}

function InlineError({ id, message }: { id: string; message: string | null }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-xs text-destructive">
      {message}
    </p>
  );
}

function inferTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "";
  }
}

function inferRegion(): string {
  try {
    const lang = navigator.language;
    return lang.split("-")[1]?.toLowerCase() ?? "";
  } catch {
    return "";
  }
}

export function StepWorkspace({ data, patch, onBack, onNext }: StepWorkspaceProps) {
  const [attempted, setAttempted] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const parsed = useMemo(
    () =>
      workspaceStepSchema.safeParse({
        displayName: data.displayName,
        teamSize: data.teamSize || undefined,
        timezone: data.timezone || undefined,
        region: data.region || undefined,
        companyName: data.companyName || undefined,
        industry: data.industry || undefined,
        phone: data.phone || undefined,
        goals: data.goals.length > 0 ? data.goals : undefined,
      }),
    [
      data.displayName,
      data.teamSize,
      data.timezone,
      data.region,
      data.companyName,
      data.industry,
      data.phone,
      data.goals,
    ],
  );

  const issues = parsed.success ? [] : parsed.error.issues;

  const errors = {
    displayName: fieldError(attempted, issues, "displayName"),
    companyName: fieldError(attempted, issues, "companyName"),
    industry: fieldError(attempted, issues, "industry"),
  };

  const handleDisplayNameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      patch({ displayName: event.target.value }),
    [patch],
  );

  const handleTeamSizeChange = useCallback(
    (value: string) => patch({ teamSize: value }),
    [patch],
  );

  const handleTimezoneChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      patch({ timezone: event.target.value }),
    [patch],
  );

  const handleRegionChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      patch({ region: event.target.value }),
    [patch],
  );

  const handleCompanyNameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      patch({ companyName: event.target.value }),
    [patch],
  );

  const handleIndustrySelect = useCallback(
    (value: string) => patch({ industry: value }),
    [patch],
  );

  const handlePhoneChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      patch({ phone: event.target.value }),
    [patch],
  );

  function handleNext() {
    if (!parsed.success) {
      setAttempted(true);
      return;
    }
    onNext();
  }

  function handleInferTimezone() {
    const tz = inferTimezone();
    if (tz) patch({ timezone: tz });
  }

  function handleInferRegion() {
    const region = inferRegion();
    if (region) patch({ region: region });
  }

  function handleToggleAdvanced() {
    setAdvancedOpen((v) => !v);
  }

  return (
    <StepBody footer={<NavButtons onBack={onBack} onNext={handleNext} />}>
      <section className="min-w-0 space-y-3">
        <div className="min-w-0 space-y-1">
          <Label htmlFor="workspace-display-name" className="text-label font-semibold text-foreground">
            Workspace name *
          </Label>
          <Input
            id="workspace-display-name"
            value={data.displayName}
            onChange={handleDisplayNameChange}
            placeholder="Acme Corp"
            maxLength={DISPLAY_NAME_MAX_LENGTH}
            autoComplete="organization"
            className="w-full text-sm"
            aria-invalid={!!errors.displayName}
            aria-describedby={errors.displayName ? "display-name-error" : undefined}
          />
          <InlineError id="display-name-error" message={errors.displayName} />
        </div>

        <div className="min-w-0 space-y-1">
          <Label className="text-label font-semibold text-foreground">Team size</Label>
          <Select onValueChange={handleTeamSizeChange} value={data.teamSize || undefined}>
            <SelectTrigger className="w-full text-sm">
              <SelectValue placeholder="Select team size" />
            </SelectTrigger>
            <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
              {TEAM_SIZES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0 space-y-1">
          <Label htmlFor="workspace-timezone" className="text-label font-semibold text-foreground">
            Timezone
          </Label>
          <div className="flex min-w-0 gap-2">
            <Input
              id="workspace-timezone"
              value={data.timezone ?? ""}
              onChange={handleTimezoneChange}
              placeholder="e.g. Asia/Kolkata"
              className="min-w-0 flex-1 text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0 text-xs"
              onClick={handleInferTimezone}
            >
              Detect
            </Button>
          </div>
        </div>

        <div className="min-w-0 space-y-1">
          <Label htmlFor="workspace-region" className="text-label font-semibold text-foreground">
            Region
          </Label>
          <div className="flex min-w-0 gap-2">
            <Input
              id="workspace-region"
              value={data.region ?? ""}
              onChange={handleRegionChange}
              placeholder="e.g. in"
              className="min-w-0 flex-1 text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0 text-xs"
              onClick={handleInferRegion}
            >
              Detect
            </Button>
          </div>
        </div>
      </section>

      <section className="min-w-0">
        <button
          type="button"
          className="flex w-full items-center gap-1.5 py-2 text-left text-sm font-medium text-muted-foreground hover:text-foreground"
          onClick={handleToggleAdvanced}
          aria-expanded={advancedOpen}
        >
          {advancedOpen ? (
            <ChevronUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
          )}
          {advancedOpen ? "Hide advanced options" : "Show advanced options"}
        </button>

        {advancedOpen && (
          <div className="mt-3 min-w-0 space-y-3">
            <div className="min-w-0 space-y-1">
              <Label htmlFor="workspace-company-name" className="text-xs">
                Company name
              </Label>
              <Input
                id="workspace-company-name"
                value={data.companyName}
                onChange={handleCompanyNameChange}
                placeholder="Acme Corp Ltd"
                maxLength={COMPANY_NAME_MAX_LENGTH}
                className="w-full text-sm"
                aria-invalid={!!errors.companyName}
                aria-describedby={errors.companyName ? "company-name-error" : undefined}
              />
              <InlineError id="company-name-error" message={errors.companyName} />
            </div>

            <div className="min-w-0 space-y-1">
              <Label htmlFor="workspace-industry" className="text-xs">
                Industry
              </Label>
              <Select
                onValueChange={handleIndustrySelect}
                value={INDUSTRIES.includes(data.industry) ? data.industry : undefined}
              >
                <SelectTrigger id="workspace-industry" className="w-full text-sm">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind} value={ind}>
                      {ind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <InlineError id="industry-error" message={errors.industry} />
            </div>

            <div className="min-w-0 space-y-1">
              <Label htmlFor="workspace-phone" className="text-xs">
                Contact phone
              </Label>
              <Input
                id="workspace-phone"
                type="tel"
                value={data.phone}
                onChange={handlePhoneChange}
                placeholder="+91 98765 43210"
                className="w-full text-sm"
              />
            </div>
          </div>
        )}
      </section>
    </StepBody>
  );
}
