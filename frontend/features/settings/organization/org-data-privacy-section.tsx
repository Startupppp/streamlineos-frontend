"use client";

import { useCallback, useState } from "react";
import { Shield } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OrgSettingsCard, SettingsField } from "./org-settings-chrome";

interface OrgDataPrivacySectionProps {
  canEdit: boolean;
}

const RETENTION_OPTIONS = [
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "180", label: "180 days" },
  { value: "365", label: "1 year" },
  { value: "730", label: "2 years" },
  { value: "0", label: "Indefinitely" },
];

export function OrgDataPrivacySection({ canEdit }: OrgDataPrivacySectionProps) {
  const [retentionDays, setRetentionDays] = useState("365");
  const handleRetentionChange = useCallback(
    (value: string) => setRetentionDays(value),
    [],
  );

  return (
    <OrgSettingsCard
      title="Data & Privacy"
      description="Manage data retention policies."
      icon={<Shield className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
      contentClassName="space-y-1"
    >
      <div className="flex flex-col gap-2.5 py-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <SettingsField label="Audit log retention" className="flex-1">
          <p className="mb-1.5 text-xs text-muted-foreground">
            How long to keep audit logs before automatic deletion.
          </p>
          <Select
            value={retentionDays}
            onValueChange={handleRetentionChange}
            disabled={!canEdit}
          >
            <SelectTrigger className="h-8 w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RETENTION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsField>
      </div>
    </OrgSettingsCard>
  );
}
