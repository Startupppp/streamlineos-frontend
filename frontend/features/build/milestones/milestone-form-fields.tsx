"use client";

import { useCallback } from "react";
import type { UseFormReturn } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MemberPicker } from "@/components/members/member-picker";
import { DatePicker } from "@/components/ui/date-picker";
import type { MilestoneFormValues } from "@/features/build/milestones/milestone-schema";
import type { MemberOption } from "@/components/members/member-picker-options";

interface MilestoneFormFieldsProps {
  form: UseFormReturn<MilestoneFormValues>;
  candidates: MemberOption[];
  userIdByMembershipId: Map<number, string>;
  membershipIdByUserId: Map<string, number>;
}

export function MilestoneFormFields({
  form,
  candidates,
  userIdByMembershipId,
  membershipIdByUserId,
}: MilestoneFormFieldsProps) {
  const targetDateValue = form.watch("targetDate");

  const handleTargetDateChange = useCallback(
    (val: string) => form.setValue("targetDate", val, { shouldValidate: true }),
    [form],
  );

  const handleOwnerChange = useCallback(
    (onChange: (membershipId: number | null) => void, userId: string | null) =>
      onChange(userId != null ? (membershipIdByUserId.get(userId) ?? null) : null),
    [membershipIdByUserId],
  );

  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name *</FormLabel>
            <FormControl>
              <Input placeholder="e.g. MVP Launch" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea
                rows={3}
                placeholder="Optional description…"
                className="resize-none"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="ownerMembershipId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Owner</FormLabel>
            <FormControl>
              <MemberPicker
                candidates={candidates}
                value={
                  field.value != null
                    ? (userIdByMembershipId.get(field.value) ?? undefined)
                    : undefined
                }
                onChange={(userId) => handleOwnerChange(field.onChange, userId)}
                allowUnassigned
                placeholder="Unassigned"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={form.control}
          name="targetDate"
          render={() => (
            <FormItem>
              <FormLabel>Target Date *</FormLabel>
              <FormControl>
                <DatePicker
                  value={targetDateValue}
                  onChange={handleTargetDateChange}
                  placeholder="Pick a date"
                  className="text-sm"
                  disablePast
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="ACHIEVED">Achieved</SelectItem>
                  <SelectItem value="MISSED">Missed</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  );
}
