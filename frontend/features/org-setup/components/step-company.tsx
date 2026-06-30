"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { getAllCountries } from "countries-and-timezones";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WizardData } from "../lib/types";
import { TEAM_SIZES } from "../lib/constants";
import { NavButtons } from "./nav-buttons";

type StepCompanyProps = {
  data: WizardData;
  patch: (updates: Partial<WizardData>) => void;
  onBack: () => void;
  onNext: () => void;
};

const ALL_COUNTRIES = Object.values(getAllCountries())
  .map((c) => ({ name: c.name, timezone: c.timezones[0] ?? "UTC" }))
  .sort((a, b) => a.name.localeCompare(b.name));

export function StepCompany({ data, patch, onBack, onNext }: StepCompanyProps) {
  const [countryOpen, setCountryOpen] = useState(false);

  const selectedCountryTimezone = useMemo(
    () => ALL_COUNTRIES.find((c) => c.name === data.country)?.timezone ?? "",
    [data.country],
  );

  function handleCompanyNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    patch({ companyName: e.target.value });
  }

  function handleTeamSizeChange(v: string) {
    patch({ teamSize: v });
  }

  function handleCountrySelect(name: string) {
    const tz = ALL_COUNTRIES.find((c) => c.name === name)?.timezone ?? "";
    patch({ country: name, timezone: tz });
    setCountryOpen(false);
  }

  function handleNext() {
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
    <div className="space-y-3">
      <p className="text-[13px] text-muted-foreground">
        You can configure everything else later.
      </p>

      <div className="space-y-1.5">
        <Label htmlFor="company-name" className="text-[13px] font-medium">
          Company name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="company-name"
          value={data.companyName}
          onChange={handleCompanyNameChange}
          placeholder="Acme Corp"
          className="h-9 text-sm"
          autoFocus
        />
        {data.companyName.trim().length > 2 && (
          <p className="text-[11px] text-muted-foreground">
            URL: {data.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-[13px] font-medium">
          Team size <span className="text-destructive">*</span>
        </Label>
        <Select onValueChange={handleTeamSizeChange} value={data.teamSize}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Select team size" />
          </SelectTrigger>
          <SelectContent>
            {TEAM_SIZES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[13px] font-medium">Country</Label>
        <Popover open={countryOpen} onOpenChange={setCountryOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={countryOpen}
              className="w-full h-9 justify-between text-sm font-normal"
            >
              <span className={cn(!data.country && "text-muted-foreground")}>
                {data.country || "Select country"}
              </span>
              <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search country…" className="h-8 text-sm" />
              <CommandList className="max-h-[180px]">
                <CommandEmpty className="py-3 text-center text-[13px] text-muted-foreground">
                  No country found.
                </CommandEmpty>
                <CommandGroup>
                  {ALL_COUNTRIES.map((c) => (
                    <CommandItem
                      key={c.name}
                      value={c.name}
                      onSelect={handleCountrySelect}
                      className="text-[13px]"
                    >
                      <Check
                        className={cn(
                          "h-3.5 w-3.5 mr-2 shrink-0",
                          data.country === c.name ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {c.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {selectedCountryTimezone && (
          <p className="text-[11px] text-muted-foreground">
            Timezone: {selectedCountryTimezone}
          </p>
        )}
      </div>

      <NavButtons onBack={onBack} onNext={handleNext} />
    </div>
  );
}
