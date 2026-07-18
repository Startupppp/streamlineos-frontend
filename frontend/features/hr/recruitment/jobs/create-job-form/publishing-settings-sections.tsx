"use client";

import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SectionTitle, Field, FieldError, ToggleRow, type SectionProps } from "./job-basics-sections";
import { cn } from "@/lib/utils";
import { Eye, Zap } from "lucide-react";

export function Section9({ form }: SectionProps) {
  const { register, control, formState: { errors } } = form;
  return (
    <div>
      <SectionTitle title="Job Status & Visibility" subtitle="Control the posting's reach and status" icon={Eye} />
      <div className="grid gap-4">
        <Field label="Status" required error={errors.status?.message}>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="w-[var(--radix-select-trigger-width)]">
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="OPEN">Published</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <Field label="Visibility" required error={errors.visibility?.message}>
          <Controller
            name="visibility"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="w-[var(--radix-select-trigger-width)]">
                  <SelectItem value="PUBLIC">Public</SelectItem>
                  <SelectItem value="INTERNAL">Internal Only</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <Field label="Application Deadline">
          <Controller
            name="applicationDeadline"
            control={control}
            render={({ field }) => (
              <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="text-sm" />
            )}
          />
        </Field>
      </div>
    </div>
  );
}

export function Section10({ form }: SectionProps) {
  const { control, formState: { errors } } = form;

  const priorityOptions = [
    { value: "LOW", label: "Low", activeClass: "bg-primary hover:bg-primary/90 text-primary-foreground border-primary" },
    { value: "MEDIUM", label: "Medium", activeClass: "bg-blue-600 hover:bg-blue-700 text-white border-blue-600" },
    { value: "HIGH", label: "High", activeClass: "bg-amber-500 hover:bg-amber-600 text-white border-amber-500" },
    { value: "URGENT", label: "Urgent", activeClass: "bg-rose-600 hover:bg-rose-700 text-white border-rose-600" },
  ] as const;

  return (
    <div>
      <SectionTitle title="Additional Settings" subtitle="Priority and workflow preferences" icon={Zap} />
      <div className="grid gap-5">
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-foreground/80">
            Priority<span className="text-rose-500 ml-0.5">*</span>
          </Label>
          <Controller
            name="priority"
            control={control}
            render={({ field }) => (
              <div className="flex gap-2">
                {priorityOptions.map(({ value, label, activeClass }) => (
                  <Button
                    key={value}
                    type="button"
                    variant={field.value === value ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "flex-1 font-semibold transition-colors duration-200",
                      field.value === value && activeClass
                    )}
                    onClick={() => field.onChange(value)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            )}
          />
          <FieldError message={errors.priority?.message} />
        </div>

        <ToggleRow
          label="Referral Enabled"
          description="Allow employees to refer candidates for this role"
        >
          <Controller
            name="referralEnabled"
            control={control}
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </ToggleRow>

        <ToggleRow
          label="Approval Required"
          description="Require manager approval before the job is published"
        >
          <Controller
            name="approvalRequired"
            control={control}
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </ToggleRow>
      </div>
    </div>
  );
}
