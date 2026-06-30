"use client";

import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WizardData } from "../_lib/types";
import { TEAM_SIZES } from "../_lib/constants";
import { NavButtons } from "./nav-buttons";

type StepCompanyProps = {
  data: WizardData;
  patch: (updates: Partial<WizardData>) => void;
  onBack: () => void;
  onNext: () => void;
};

export function StepCompany({ data, patch, onBack, onNext }: StepCompanyProps) {
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
          onChange={(e) => patch({ companyName: e.target.value })}
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
        <Select onValueChange={(v) => patch({ teamSize: v })} value={data.teamSize}>
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

      <NavButtons onBack={onBack} onNext={handleNext} />
    </div>
  );
}
