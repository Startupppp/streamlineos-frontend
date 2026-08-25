"use client";

import { Controller } from "react-hook-form";
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

interface PriorityButtonProps {
  value: string;
  label: string;
  activeClass: string;
  isActive: boolean;
  onChange: (value: string) => void;
}

function PriorityButton({ value, label, activeClass, isActive, onChange }: PriorityButtonProps) {
  function handleClick() { onChange(value); }
  return (
    <Button
      type="button"
      variant={isActive ? "default" : "outline"}
      size="sm"
      className={cn(
        "flex-1 font-semibold transition-colors duration-200",
        isActive && activeClass
      )}
      onClick={handleClick}
    >
      {label}
    </Button>
  );
}

export function Section9({ form }: SectionProps) {
  const { control, formState: { errors } } = form;
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
                <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
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
                <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
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
    { value: "MEDIUM", label: "Medium", activeClass: "bg-status-info-fill hover:bg-status-info-fill-hover text-white border-status-info-rule" },
    { value: "HIGH", label: "High", activeClass: "bg-status-warning-fill hover:bg-status-warning-fill-hover text-white border-status-warning-rule" },
    { value: "URGENT", label: "Urgent", activeClass: "bg-status-danger-fill hover:bg-status-danger-fill-hover text-white border-status-danger-rule" },
  ] as const;

  return (
    <div>
      <SectionTitle title="Additional Settings" subtitle="Priority and workflow preferences" icon={Zap} />
      <div className="grid gap-5">
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-foreground/80">
            Priority<span className="text-status-danger-ink ml-0.5">*</span>
          </Label>
          <Controller
            name="priority"
            control={control}
            render={({ field }) => (
              <div className="flex gap-2">
                {priorityOptions.map(({ value, label, activeClass }) => (
                  <PriorityButton
                    key={value}
                    value={value}
                    label={label}
                    activeClass={activeClass}
                    isActive={field.value === value}
                    onChange={field.onChange}
                  />
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
