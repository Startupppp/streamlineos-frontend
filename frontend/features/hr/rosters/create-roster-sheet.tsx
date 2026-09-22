"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { HrSheet } from "@/components/shared/hr-sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateRoster } from "@/hooks/api/hr/rosters";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  isNotMonday,
  nextRosterMonday,
  rosterSchema,
  rosterWeekEnd,
  type RosterFormValues,
} from "@/features/hr/rosters/roster-schema";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function CreateRosterSheet({ open, onOpenChange }: Props) {
  const createRoster = useCreateRoster();
  const form = useForm<RosterFormValues>({
    resolver: zodResolver(rosterSchema),
    defaultValues: {
      name: "",
      weekStart: nextRosterMonday(new Date()),
    },
  });

  const weekStart = form.watch("weekStart");
  const weekEnd = rosterWeekEnd(weekStart);

  const onSubmit = useCallback(
    (data: RosterFormValues) => {
      createRoster.mutate(
        { name: data.name, weekStart: data.weekStart, weekEnd: rosterWeekEnd(data.weekStart) },
        {
          onSuccess: () => {
            toast.success("Roster created");
            form.reset();
            onOpenChange(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [createRoster, form, onOpenChange],
  );

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Create roster"
      description="Set up a new weekly scheduling roster"
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel="Create roster"
      isPending={createRoster.isPending}
    >
      <Form {...form}>
        <div className="space-y-5">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                  Roster name
                </FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Week 26 Roster" className="text-sm" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="weekStart"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                  Week start (a Monday)
                </FormLabel>
                <FormControl>
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select a Monday"
                    disabledDays={isNotMonday}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {weekEnd && (
            <div className="text-xs text-muted-foreground">
              Week ends: <span className="font-medium text-foreground">{weekEnd}</span>
            </div>
          )}
        </div>
      </Form>
    </HrSheet>
  );
}
