"use client";

import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { DisplayToggleRow } from "@/features/build/shared/display-toggle-row";
import type { CustomerDisplayPrefs } from "./use-customer-display-prefs";

const PROPERTY_TOGGLES: {
  key: keyof CustomerDisplayPrefs;
  label: string;
}[] = [
  { key: "showRequests", label: "Requests" },
  { key: "showAnnualRevenue", label: "Annual revenue" },
  { key: "showSize", label: "Size" },
  { key: "showOwner", label: "Owner" },
  { key: "showStatus", label: "Status" },
  { key: "showTier", label: "Tier" },
  { key: "showDomains", label: "Domains" },
  { key: "showDataSource", label: "Data source" },
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
    <ResponsivePopover>
      <ResponsivePopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          Display
        </Button>
      </ResponsivePopoverTrigger>
      <ResponsivePopoverContent
        align="end"
        title="Display properties"
        className="w-64 p-3"
      >
        <p className="mb-3 text-[13px] font-semibold text-foreground">
          Display properties
        </p>
        <div>
          {PROPERTY_TOGGLES.map((p) => (
            <DisplayToggleRow
              key={p.key}
              id={`cust-toggle-${p.key}`}
              label={p.label}
              checked={prefs[p.key]}
              onCheckedChange={() => onToggle(p.key)}
            />
          ))}
        </div>
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
}
