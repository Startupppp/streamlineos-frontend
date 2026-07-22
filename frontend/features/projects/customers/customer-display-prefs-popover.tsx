"use client";

import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { CustomerDisplayPrefs } from "./use-customer-display-prefs";

interface ToggleRowProps {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: () => void;
}

function ToggleRow({ id, label, checked, onCheckedChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <Label
        htmlFor={id}
        className="cursor-pointer text-[13px] font-normal text-foreground"
      >
        {label}
      </Label>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="h-4 w-7 [&_span]:h-3 [&_span]:w-3"
      />
    </div>
  );
}

const PROPERTY_TOGGLES: {
  key: keyof CustomerDisplayPrefs;
  label: string;
  note?: string;
}[] = [
  { key: "showRequests", label: "Requests", note: "(backend gap — needs ticket.customerId)" },
  { key: "showAnnualRevenue", label: "Annual revenue", note: "(backend gap — field not in CRM schema)" },
  { key: "showSize", label: "Size" },
  { key: "showOwner", label: "Owner", note: "(backend gap — no owner field on CrmOrganization)" },
  { key: "showStatus", label: "Status", note: "(mapped from healthScore)" },
  { key: "showTier", label: "Tier", note: "(backend gap — field not in CRM schema)" },
  { key: "showDomains", label: "Domains" },
  { key: "showDataSource", label: "Data source", note: "(backend gap — field not in CRM schema)" },
];

interface CustomerDisplayPrefsPopoverProps {
  prefs: CustomerDisplayPrefs;
  onToggle: (key: keyof CustomerDisplayPrefs) => void;
}

export function CustomerDisplayPrefsPopover({
  prefs,
  onToggle,
}: CustomerDisplayPrefsPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          Display
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3">
        <p className="mb-3 text-[13px] font-semibold text-foreground">
          Display properties
        </p>
        <div className="space-y-0.5">
          {PROPERTY_TOGGLES.map((p) => (
            <ToggleRow
              key={p.key}
              id={`cust-toggle-${p.key}`}
              label={p.label}
              checked={prefs[p.key]}
              onCheckedChange={() => onToggle(p.key)}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
