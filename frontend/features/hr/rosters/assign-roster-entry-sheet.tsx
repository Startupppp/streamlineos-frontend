"use client";

import { useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { EntityFormSheet } from "@/components/shared";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { UserCombobox } from "@/components/ui/user-combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { getErrorMessage } from "@/lib/get-error-message";
import { useHrShifts } from "@/hooks/api/hr/shifts";
import { useUpsertRosterEntry } from "@/hooks/api/hr/rosters";
import {
  rosterEntrySchema,
  emptyRosterEntry,
  rosterEntryPayload,
  type RosterEntryFormValues,
} from "./assign-roster-entry-schema";

interface AssignRosterEntrySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rosterId: number;
  rosterName: string;
  weekStart: string;
  weekEnd: string;
}

export function AssignRosterEntrySheet({
  open,
  onOpenChange,
  rosterId,
  rosterName,
  weekStart,
  weekEnd,
}: AssignRosterEntrySheetProps) {
  const { data: shifts } = useHrShifts();
  const upsert = useUpsertRosterEntry();

  const handleSubmit = useCallback(
    (values: RosterEntryFormValues) => {
      upsert.mutate(
        { rosterId, ...rosterEntryPayload(values) },
        {
          onSuccess: () => {
            toast.success("Added to the roster");
            onOpenChange(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [onOpenChange, rosterId, upsert],
  );

  return (
    <EntityFormSheet<RosterEntryFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={`Assign to ${rosterName}`}
      description={`Pick who is working on a day between ${weekStart} and ${weekEnd}.`}
      resolver={zodResolver(rosterEntrySchema)}
      defaultValues={{ ...emptyRosterEntry, date: weekStart }}
      onSubmit={handleSubmit}
      isSubmitting={upsert.isPending}
      submitLabel="Add to roster"
      resetOnOpen
    >
      {(form) => {
        const isDayOff = form.watch("isDayOff");
        return (
          <>
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee</FormLabel>
                  <FormControl>
                    <UserCombobox
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select employee…"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      min={weekStart}
                      max={weekEnd}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isDayOff"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between gap-3">
                  <div>
                    <FormLabel>Day off</FormLabel>
                    <FormDescription>
                      A rostered day off instead of a shift.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {!isDayOff && (
              <FormField
                control={form.control}
                name="shiftId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shift</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a shift…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                        {(shifts ?? []).map((shift) => (
                          <SelectItem key={shift.id} value={String(shift.id)}>
                            {shift.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {(shifts ?? []).length === 0
                        ? "No shifts exist yet — create one under Shifts first."
                        : "Leave blank only for a day off."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
      }}
    </EntityFormSheet>
  );
}
