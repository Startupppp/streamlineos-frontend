"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { addDays, format } from "date-fns";
import { toast } from "sonner";
import { HrSheet } from "@/features/hr/hr-sheet";
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

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  weekStart: z.string().min(1, "Week start is required"),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function CreateRosterSheet({ open, onOpenChange }: Props) {
  const createRoster = useCreateRoster();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      weekStart: format(new Date(), "yyyy-MM-dd"),
    },
  });

  const weekStart = form.watch("weekStart");
  const weekEnd = weekStart ? format(addDays(new Date(weekStart), 6), "yyyy-MM-dd") : "";

  const onSubmit = useCallback(
    (data: FormValues) => {
      const end = format(addDays(new Date(data.weekStart), 6), "yyyy-MM-dd");
      createRoster.mutate(
        { name: data.name, weekStart: data.weekStart, weekEnd: end },
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
      title="Create Roster"
      description="Set up a new weekly scheduling roster"
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel="Create Roster"
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
                  Roster Name
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
                  Week Start (Monday)
                </FormLabel>
                <FormControl>
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select week start"
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
