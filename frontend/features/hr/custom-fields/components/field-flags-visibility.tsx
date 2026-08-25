"use client";

import { Controller, type UseFormReturn } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Lock } from "lucide-react";
import { SENSITIVE_WARNING_TEXT } from "../lib/custom-field-form";
import { type FieldFormValues } from "../lib/custom-field-form";

const VISIBILITY_OPTIONS = [
  {
    name: "visibilityHrOnly" as const,
    label: "HR only (hidden from managers and employees)",
  },
  { name: "visibilityManagerVisible" as const, label: "Visible to managers" },
  {
    name: "visibilitySelfService" as const,
    label: "Visible in employee self-service",
  },
  { name: "visibilityHiddenFromExports" as const, label: "Hidden from exports" },
];

interface FieldFlagsAndVisibilityProps {
  form: UseFormReturn<FieldFormValues>;
  watchedIsSensitive: boolean;
}

export function FieldFlagsAndVisibility({
  form,
  watchedIsSensitive,
}: FieldFlagsAndVisibilityProps) {
  return (
    <>
      <Separator />

      <div className="space-y-3">
        <Label className="text-xs font-medium">Field Flags</Label>
        <div className="flex items-center gap-2">
          <Controller
            control={form.control}
            name="isRequired"
            render={({ field: f }) => (
              <Switch checked={f.value} onCheckedChange={f.onChange} id="isRequired" />
            )}
          />
          <Label htmlFor="isRequired" className="text-sm cursor-pointer">
            Required
          </Label>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Controller
              control={form.control}
              name="isSensitive"
              render={({ field: f }) => (
                <Switch checked={f.value} onCheckedChange={f.onChange} id="isSensitive" />
              )}
            />
            <Label htmlFor="isSensitive" className="text-sm cursor-pointer">
              Sensitive
            </Label>
            {watchedIsSensitive && (
              <Lock className="h-3.5 w-3.5 text-status-warning-ink" />
            )}
          </div>
          {watchedIsSensitive && (
            <div className="flex gap-2 p-3 bg-status-warning-surface border border-status-warning-rule rounded-md">
              <AlertTriangle className="h-4 w-4 text-status-warning-ink shrink-0 mt-0.5" />
              <p className="text-xs text-status-warning-ink">{SENSITIVE_WARNING_TEXT}</p>
            </div>
          )}
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <Label className="text-xs font-medium">Visibility</Label>
        <div className="space-y-2">
          {VISIBILITY_OPTIONS.map(({ name, label }) => (
            <div key={name} className="flex items-center gap-2">
              <Controller
                control={form.control}
                name={name}
                render={({ field: f }) => (
                  <Checkbox id={name} checked={f.value} onCheckedChange={f.onChange} />
                )}
              />
              <Label htmlFor={name} className="text-sm font-normal cursor-pointer">
                {label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <Label className="text-xs font-medium">Reporting &amp; Search</Label>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Controller
              control={form.control}
              name="searchable"
              render={({ field: f }) => (
                <Checkbox id="searchable" checked={f.value} onCheckedChange={f.onChange} />
              )}
            />
            <Label htmlFor="searchable" className="text-sm font-normal cursor-pointer">
              Include in search results
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Controller
              control={form.control}
              name="reportable"
              render={({ field: f }) => (
                <Checkbox id="reportable" checked={f.value} onCheckedChange={f.onChange} />
              )}
            />
            <Label htmlFor="reportable" className="text-sm font-normal cursor-pointer">
              Available in reports
            </Label>
          </div>
        </div>
      </div>
    </>
  );
}
