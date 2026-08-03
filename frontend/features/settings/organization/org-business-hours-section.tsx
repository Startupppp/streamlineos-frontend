"use client";

import { useState, useCallback } from "react";
import { Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { useUpdateOrgSettings } from "@/hooks/api/organization";
import type { OrgSettings } from "@/types/organization";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  OrgSettingsCard,
  OrgSettingsEditButton,
  OrgSettingsFormActions,
} from "./org-settings-chrome";

type DayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

const DAYS: { key: DayKey; label: string; short: string }[] = [
  { key: "monday", label: "Monday", short: "Mon" },
  { key: "tuesday", label: "Tuesday", short: "Tue" },
  { key: "wednesday", label: "Wednesday", short: "Wed" },
  { key: "thursday", label: "Thursday", short: "Thu" },
  { key: "friday", label: "Friday", short: "Fri" },
  { key: "saturday", label: "Saturday", short: "Sat" },
  { key: "sunday", label: "Sunday", short: "Sun" },
];

const DEFAULT_HOURS: Record<DayKey, { open: string; close: string; enabled: boolean }> = {
  monday: { open: "09:00", close: "18:00", enabled: true },
  tuesday: { open: "09:00", close: "18:00", enabled: true },
  wednesday: { open: "09:00", close: "18:00", enabled: true },
  thursday: { open: "09:00", close: "18:00", enabled: true },
  friday: { open: "09:00", close: "18:00", enabled: true },
  saturday: { open: "09:00", close: "14:00", enabled: false },
  sunday: { open: "09:00", close: "14:00", enabled: false },
};

function mergeHours(saved: OrgSettings["businessHours"]): Record<DayKey, { open: string; close: string; enabled: boolean }> {
  const result = { ...DEFAULT_HOURS };
  if (!saved) return result;
  for (const day of DAYS) {
    if (saved[day.key]) {
      result[day.key] = {
        open: saved[day.key].open ?? "09:00",
        close: saved[day.key].close ?? "18:00",
        enabled: saved[day.key].enabled ?? false,
      };
    }
  }
  return result;
}

interface OrgBusinessHoursSectionProps {
  org: OrgSettings;
  canEdit: boolean;
}

export function OrgBusinessHoursSection({ org, canEdit }: OrgBusinessHoursSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [hours, setHours] = useState<Record<DayKey, { open: string; close: string; enabled: boolean }>>(() => mergeHours(org.businessHours));
  const { mutate: updateOrg, isPending } = useUpdateOrgSettings();

  const handleEdit = useCallback(() => {
    setHours(mergeHours(org.businessHours));
    setIsEditing(true);
  }, [org.businessHours]);

  const handleCancel = useCallback(() => {
    setHours(mergeHours(org.businessHours));
    setIsEditing(false);
  }, [org.businessHours]);

  const handleToggle = useCallback((day: DayKey, enabled: boolean) => {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], enabled } }));
  }, []);

  const handleTimeChange = useCallback((day: DayKey, field: "open" | "close", value: string) => {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  }, []);

  const handleSave = useCallback(() => {
    updateOrg(
      { businessHours: hours },
      {
        onSuccess: () => {
          toast.success("Business hours saved");
          setIsEditing(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [hours, updateOrg]);

  const display = mergeHours(org.businessHours);
  const activeDays = DAYS.filter((d) => display[d.key].enabled);
  const closedDays = DAYS.filter((d) => !display[d.key].enabled);

  return (
    <OrgSettingsCard
      title="Business Hours"
      description="Define working days and hours for your organization."
      icon={<Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
      action={canEdit && !isEditing ? <OrgSettingsEditButton onClick={handleEdit} /> : undefined}
    >
      {!isEditing ? (
        <div className="space-y-1.5">
          {activeDays.length === 0 ? (
            <p className="text-sm text-muted-foreground">No working days configured.</p>
          ) : (
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {activeDays.map((d) => (
                <div key={d.key} className="flex items-baseline gap-2 text-sm min-w-0">
                  <span className="w-20 shrink-0 font-medium">{d.label}</span>
                  <span className="text-muted-foreground font-mono text-xs tabular-nums">
                    {display[d.key].open} – {display[d.key].close}
                  </span>
                </div>
              ))}
            </div>
          )}
          {closedDays.length > 0 && (
            <p className="text-xs text-muted-foreground pt-1">
              Closed: {closedDays.map((d) => d.short).join(", ")}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {DAYS.map((d) => {
            const h = hours[d.key];
            return (
              <div key={d.key} className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2 w-20 shrink-0">
                  <Checkbox
                    id={`bh-${d.key}`}
                    checked={h.enabled}
                    onCheckedChange={(checked) => handleToggle(d.key, !!checked)}
                    className="bg-card border-border"
                  />
                  <Label htmlFor={`bh-${d.key}`} className="text-sm font-medium cursor-pointer">{d.short}</Label>
                </div>
                {h.enabled ? (
                  <div className="flex items-center gap-2 min-w-0">
                    <Input type="time" value={h.open} onChange={(e) => handleTimeChange(d.key, "open", e.target.value)} className="h-8 w-[7.5rem] font-mono text-xs" />
                    <span className="text-muted-foreground text-xs">to</span>
                    <Input type="time" value={h.close} onChange={(e) => handleTimeChange(d.key, "close", e.target.value)} className="h-8 w-[7.5rem] font-mono text-xs" />
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Closed</span>
                )}
              </div>
            );
          })}
          <OrgSettingsFormActions onCancel={handleCancel} isPending={isPending} className="pt-2">
            <LoadingButton size="sm" isPending={isPending} onClick={handleSave} className="h-8 gap-1.5" loadingText="Saving…">
              Save hours
            </LoadingButton>
          </OrgSettingsFormActions>
        </div>
      )}
    </OrgSettingsCard>
  );
}
