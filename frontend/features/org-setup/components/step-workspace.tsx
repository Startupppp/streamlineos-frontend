"use client";

import { useMemo, useState, type ReactNode } from "react";
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
import type { Country } from "react-phone-number-input";
import { COUNTRY_OPTIONS, timezonesForCountry } from "@/lib/location/org-locale-options";
import { DISPLAY_NAME_MAX_LENGTH, parseWorkspaceStep } from "../lib/basics-schema";
import type { WizardData } from "../lib/wizard-data-schema";
import { NavButtons } from "./nav-buttons";
import { StepBody } from "./step-body";

type StepWorkspaceProps = {
  data: WizardData;
  patch: (updates: Partial<WizardData>) => void;
  onNext: () => void;
  restoreSlot?: ReactNode;
};

export function StepWorkspace({ data, patch, onNext, restoreSlot }: StepWorkspaceProps) {
  const [attempted, setAttempted] = useState(false);
  const parsed = useMemo(() => parseWorkspaceStep(data), [data]);
  const nameError = attempted && !parsed.success
    ? parsed.error.issues.find((issue) => issue.path[0] === "displayName")?.message
    : undefined;
  const phoneError = attempted && !parsed.success
    ? parsed.error.issues.find((issue) => issue.path[0] === "phone")?.message
    : undefined;
  const countryError = attempted && !parsed.success
    ? parsed.error.issues.find((issue) => issue.path[0] === "country")?.message
    : undefined;
  const timezoneError = attempted && !parsed.success
    ? parsed.error.issues.find((issue) => issue.path[0] === "timezone")?.message
    : undefined;
  const timezoneOptions = data.country ? timezonesForCountry(data.country) : [];

  function handleCountryChange(country: string) {
    const zones = timezonesForCountry(country);
    let browserTimezone = "";
    try {
      browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
    }
    patch({
      country,
      timezone: zones.includes(data.timezone ?? "")
        ? data.timezone
        : zones.includes(browserTimezone)
          ? browserTimezone
          : zones.length === 1
            ? zones[0]
            : undefined,
    });
  }

  function handleLaunch() {
    if (!parsed.success) {
      setAttempted(true);
      return;
    }
    onNext();
  }

  return (
    <StepBody
      footer={
        <NavButtons
          onNext={handleLaunch}
          nextLabel="Continue to invitations"
        />
      }
    >
      {restoreSlot}
      <section className="min-w-0 space-y-2">
        <Label htmlFor="workspace-display-name" className="text-label font-semibold text-foreground">
          Workspace name *
        </Label>
        <Input
          id="workspace-display-name"
          value={data.displayName}
          onChange={(event) => patch({ displayName: event.target.value })}
          placeholder="Acme Corp"
          maxLength={DISPLAY_NAME_MAX_LENGTH}
          autoComplete="organization"
          className="w-full text-sm"
          aria-invalid={Boolean(nameError)}
          aria-describedby={nameError ? "display-name-error" : undefined}
        />
        {nameError ? <p id="display-name-error" role="alert" className="text-xs text-destructive">{nameError}</p> : null}
        {data.displayName.length >= DISPLAY_NAME_MAX_LENGTH - 20 ? (
          <p className="text-dense tabular-nums text-muted-foreground" aria-live="polite">
            {data.displayName.length}/{DISPLAY_NAME_MAX_LENGTH} characters
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Every available module will be ready. Add industry and company size after launch.
        </p>
      </section>

      <section className="min-w-0 space-y-2">
        <Label htmlFor="workspace-phone" className="text-label font-semibold text-foreground">
          Contact phone *
        </Label>
        <PhoneInput
          id="workspace-phone"
          key={data.country ?? "no-country"}
          value={data.phone}
          onChange={(value) => patch({ phone: value ?? "" })}
          defaultCountry={data.country as Country | undefined}
          placeholder="Phone number with country code"
          aria-invalid={Boolean(phoneError)}
          aria-describedby={phoneError ? "workspace-phone-error" : undefined}
        />
        {phoneError ? <p id="workspace-phone-error" role="alert" className="text-xs text-destructive">{phoneError}</p> : null}
        <p className="text-xs text-muted-foreground">Use a number where we can reach you about your workspace.</p>
      </section>

      <section className="grid min-w-0 gap-3 sm:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <Label htmlFor="workspace-country" className="text-label font-semibold text-foreground">
            Country *
          </Label>
          <Select value={data.country ?? ""} onValueChange={handleCountryChange}>
            <SelectTrigger
              id="workspace-country"
              aria-invalid={Boolean(countryError)}
              aria-describedby={countryError ? "workspace-country-error" : undefined}
              className="w-full text-sm"
            >
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent className="max-h-72 min-w-[var(--radix-select-trigger-width)]">
              {COUNTRY_OPTIONS.map((country) => (
                <SelectItem key={country.value} value={country.value}>{country.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {countryError ? <p id="workspace-country-error" role="alert" className="text-xs text-destructive">{countryError}</p> : null}
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="workspace-timezone" className="text-label font-semibold text-foreground">
            Time zone *
          </Label>
          <Select
            value={data.timezone ?? ""}
            onValueChange={(timezone) => patch({ timezone })}
            disabled={!data.country}
          >
            <SelectTrigger
              id="workspace-timezone"
              aria-invalid={Boolean(timezoneError)}
              aria-describedby={timezoneError ? "workspace-timezone-error" : undefined}
              className="w-full text-sm"
            >
              <SelectValue placeholder="Select time zone" />
            </SelectTrigger>
            <SelectContent className="max-h-72 min-w-[var(--radix-select-trigger-width)]">
              {timezoneOptions.map((timezone) => (
                <SelectItem key={timezone} value={timezone}>{timezone}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {timezoneError ? <p id="workspace-timezone-error" role="alert" className="text-xs text-destructive">{timezoneError}</p> : null}
        </div>
      </section>
    </StepBody>
  );
}
