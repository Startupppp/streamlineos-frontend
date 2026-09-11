"use client";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { HrPolicyType } from "@/types/hr/policies";
import type { UseFormReturn } from "react-hook-form";
import type { PolicyFormValues } from "./policy-form-types";
import { numericFieldChangeOr } from "@/lib/numeric-field";

interface Props {
  policyType: HrPolicyType;
  form: UseFormReturn<PolicyFormValues>;
  disabled?: boolean;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
      {children}
    </FormLabel>
  );
}

function NumberField({
  form,
  name,
  label,
  disabled,
}: {
  form: UseFormReturn<PolicyFormValues>;
  name: string;
  label: string;
  disabled?: boolean;
}) {
  return (
    <FormField
      control={form.control}
      name={`rules.${name}` as `rules.${string}`}
      render={({ field }) => (
        <FormItem>
          <FieldLabel>{label}</FieldLabel>
          <FormControl>
            <Input
              type="number"
              className="text-xs"
              value={(field.value as number) ?? 0}
              onChange={numericFieldChangeOr(field.onChange, 0)}
              disabled={disabled}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function BoolField({
  form,
  name,
  label,
  disabled,
}: {
  form: UseFormReturn<PolicyFormValues>;
  name: string;
  label: string;
  disabled?: boolean;
}) {
  return (
    <FormField
      control={form.control}
      name={`rules.${name}` as `rules.${string}`}
      render={({ field }) => (
        <FormItem className="flex items-center gap-3 space-y-0">
          <FormControl>
            <Switch
              checked={!!field.value}
              onCheckedChange={field.onChange}
              disabled={disabled}
            />
          </FormControl>
          <FieldLabel>{label}</FieldLabel>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function SelectField({
  form,
  name,
  label,
  options,
  disabled,
}: {
  form: UseFormReturn<PolicyFormValues>;
  name: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
}) {
  return (
    <FormField
      control={form.control}
      name={`rules.${name}` as `rules.${string}`}
      render={({ field }) => (
        <FormItem>
          <FieldLabel>{label}</FieldLabel>
          <Select
            onValueChange={field.onChange}
            value={field.value as string}
            disabled={disabled}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function PolicyRulesFields({ policyType, form, disabled }: Props) {
  if (policyType === "leave") {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <NumberField form={form} name="accrualAmount" label="Accrual Amount (days)" disabled={disabled} />
          <SelectField
            form={form}
            name="accrualFrequency"
            label="Accrual Frequency"
            disabled={disabled}
            options={[
              { value: "monthly", label: "Monthly" },
              { value: "quarterly", label: "Quarterly" },
              { value: "yearly", label: "Yearly" },
            ]}
          />
          <NumberField form={form} name="maxBalance" label="Max Balance (days)" disabled={disabled} />
          <NumberField form={form} name="carryForwardLimit" label="Carry Forward Limit" disabled={disabled} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <BoolField form={form} name="encashmentEligible" label="Encashment Eligible" disabled={disabled} />
          <BoolField form={form} name="probationRestricted" label="Probation Restricted" disabled={disabled} />
          <BoolField form={form} name="sandwichRule" label="Sandwich Rule" disabled={disabled} />
          <BoolField form={form} name="halfDayAllowed" label="Half Day Allowed" disabled={disabled} />
        </div>
      </div>
    );
  }

  if (policyType === "attendance") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <NumberField form={form} name="graceMinutes" label="Grace Period (min)" disabled={disabled} />
        <NumberField form={form} name="halfDayThresholdMinutes" label="Half-Day Threshold (min)" disabled={disabled} />
        <SelectField
          form={form}
          name="lateArrivalPenalty"
          label="Late Arrival Penalty"
          disabled={disabled}
          options={[
            { value: "none", label: "None" },
            { value: "half_day", label: "Half Day" },
            { value: "full_day", label: "Full Day" },
          ]}
        />
      </div>
    );
  }

  if (policyType === "overtime") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <NumberField form={form} name="dailyThresholdMinutes" label="Daily Threshold (min)" disabled={disabled} />
        <NumberField form={form} name="weeklyThresholdMinutes" label="Weekly Threshold (min)" disabled={disabled} />
        <NumberField form={form} name="minDurationMinutes" label="Min Duration (min)" disabled={disabled} />
        <NumberField form={form} name="overtimeMultiplier" label="Multiplier" disabled={disabled} />
        <BoolField form={form} name="compOffConversion" label="Convert to Comp-Off" disabled={disabled} />
      </div>
    );
  }

  if (policyType === "probation") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <NumberField form={form} name="durationDays" label="Duration (days)" disabled={disabled} />
        <NumberField form={form} name="maxExtensions" label="Max Extensions" disabled={disabled} />
        <NumberField form={form} name="maxExtensionDays" label="Extension Duration (days)" disabled={disabled} />
        <BoolField form={form} name="extensionAllowed" label="Extension Allowed" disabled={disabled} />
      </div>
    );
  }

  if (policyType === "notice_period") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <NumberField form={form} name="permanentDays" label="Permanent Staff (days)" disabled={disabled} />
        <NumberField form={form} name="contractDays" label="Contract Staff (days)" disabled={disabled} />
        <NumberField form={form} name="probationDays" label="Probation (days)" disabled={disabled} />
        <BoolField form={form} name="buyoutAllowed" label="Buyout Allowed" disabled={disabled} />
      </div>
    );
  }

  if (policyType === "wfh") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <NumberField form={form} name="monthlyQuota" label="Monthly Quota (days)" disabled={disabled} />
        <NumberField form={form} name="weeklyMax" label="Weekly Max (days)" disabled={disabled} />
        <BoolField form={form} name="requireApproval" label="Require Approval" disabled={disabled} />
        <BoolField form={form} name="probationRestricted" label="Probation Restricted" disabled={disabled} />
        <BoolField form={form} name="allowConsecutive" label="Allow Consecutive" disabled={disabled} />
      </div>
    );
  }

  if (policyType === "expense") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <NumberField form={form} name="dailyLimit" label="Daily Limit" disabled={disabled} />
        <NumberField form={form} name="monthlyLimit" label="Monthly Limit" disabled={disabled} />
        <NumberField form={form} name="receiptThreshold" label="Receipt Threshold" disabled={disabled} />
        <BoolField form={form} name="requireReceipt" label="Require Receipt" disabled={disabled} />
      </div>
    );
  }

  return (
    <p className="text-xs text-muted-foreground italic">
      No specific rule editor for this policy type — rules will be stored as JSON.
    </p>
  );
}
