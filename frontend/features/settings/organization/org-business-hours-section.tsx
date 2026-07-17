"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Clock } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { useUpdateOrgSettings } from "@/hooks/api/organization";
import type { OrgSettings } from "@/types/organization";
import { getErrorMessage } from "@/lib/get-error-message";

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

  return (
    <Card className="rounded-lg border border-border">
      <CardHeader className="pb-2 flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600" />
            Business Hours
          </CardTitle>
          <CardDescription>Define working days and hours for your organization.</CardDescription>
        </div>
        {canEdit && !isEditing && (
          <Button variant="outline" size="sm" onClick={handleEdit} className="gap-1.5 h-8 text-xs">
            <Pencil className="h-3 w-3" /> Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="pb-5">
        {!isEditing ? (
          <div className="space-y-2">
            {activeDays.length === 0 ? (
              <p className="text-sm text-muted-foreground">No working days configured.</p>
            ) : (
              activeDays.map((d) => (
                <div key={d.key} className="flex items-center gap-4 text-sm">
                  <span className="w-24 font-medium">{d.label}</span>
                  <span className="text-muted-foreground font-mono text-xs">{display[d.key].open} – {display[d.key].close}</span>
                </div>
              ))
            )}
            {DAYS.filter((d) => !display[d.key].enabled).length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Closed: {DAYS.filter((d) => !display[d.key].enabled).map((d) => d.short).join(", ")}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {DAYS.map((d) => {
              const h = hours[d.key];
              return (
                <div key={d.key} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 w-28 shrink-0">
                    <Checkbox
                      id={`bh-${d.key}`}
                      checked={h.enabled}
                      onCheckedChange={(checked) => handleToggle(d.key, !!checked)}
                    />
                    <Label htmlFor={`bh-${d.key}`} className="text-sm font-medium cursor-pointer">{d.short}</Label>
                  </div>
                  {h.enabled ? (
                    <div className="flex items-center gap-2">
                      <Input type="time" value={h.open} onChange={(e) => handleTimeChange(d.key, "open", e.target.value)} className="h-8 w-28 text-sm font-mono" />
                      <span className="text-muted-foreground text-xs">to</span>
                      <Input type="time" value={h.close} onChange={(e) => handleTimeChange(d.key, "close", e.target.value)} className="h-8 w-28 text-sm font-mono" />
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Closed</span>
                  )}
                </div>
              );
            })}
            <div className="flex gap-2 pt-3">
              <LoadingButton size="sm" isPending={isPending} onClick={handleSave} className="gap-1.5" loadingText="Saving…">
                Save hours
              </LoadingButton>
              <Button type="button" variant="ghost" size="sm" onClick={handleCancel} disabled={isPending}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

