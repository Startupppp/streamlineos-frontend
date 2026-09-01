"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CalendarDays } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { InfoIcon, PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { format, parseISO } from "date-fns";
import { TruncatedText } from "@/components/ui/truncated-text";
import { OrgSettingsCard } from "./org-settings-chrome";

type OrgHoliday = {
  id: string;
  name: string;
  date: string;
  recurring: boolean;
  createdAt: string;
};

const addHolidaySchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  recurring: z.boolean().optional(),
});

type AddHolidayValues = z.infer<typeof addHolidaySchema>;

function useOrgHolidays() {
  return useQuery<OrgHoliday[]>({
    queryKey: ["org", "holidays"],
    queryFn: ({ signal }) => apiClient.get<OrgHoliday[]>("/organization/holidays", undefined, signal),
  });
}

function useCreateHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddHolidayValues) =>
      apiClient.post<OrgHoliday>("/organization/holidays", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", "holidays"] });
      toast.success("Holiday added");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

function useDeleteHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/organization/holidays/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", "holidays"] });
      toast.success("Holiday removed");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

interface OrgHolidayCalendarSectionProps {
  canEdit: boolean;
}

function DeleteHolidayButton({ holidayId, onDelete, disabled }: { holidayId: string; onDelete: (id: string) => void; disabled: boolean }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  function handleClick() {
    onDelete(holidayId);
  }
  return (
    <button
      type="button"
      aria-label="Delete holiday"
      onClick={handleClick}
      disabled={disabled}
      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
      {...hoverHandlers}
    >
      <Trash2Icon ref={iconRef} size={16} />
    </button>
  );
}

function HolidayUsageInfo() {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
            aria-label="Holiday calendar usage"
            {...hoverHandlers}
          >
            <InfoIcon ref={iconRef} size={14} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[16rem] text-xs">
          Used for attendance, leave, and SLA calculations
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function OrgHolidayCalendarSection({ canEdit }: OrgHolidayCalendarSectionProps) {
  const { data: holidays, isLoading } = useOrgHolidays();
  const createMutation = useCreateHoliday();
  const deleteMutation = useDeleteHoliday();
  const [showAdd, setShowAdd] = useState(false);

  const form = useForm<AddHolidayValues>({
    resolver: zodResolver(addHolidaySchema),
    defaultValues: { name: "", date: "", recurring: false },
  });

  const handleAdd = useCallback((values: AddHolidayValues) => {
    createMutation.mutate(values, {
      onSuccess: () => {
        setShowAdd(false);
        form.reset();
      },
    });
  }, [createMutation, form]);

  const handleOpenAdd = useCallback(() => setShowAdd(true), []);
  const handleCancelAdd = useCallback(() => { setShowAdd(false); form.reset(); }, [form]);
  const handleDelete = useCallback((id: string) => { deleteMutation.mutate(id); }, [deleteMutation]);

  const holidayCount = holidays?.length ?? 0;

  return (
    <OrgSettingsCard
      title="Holiday Calendar"
      description="Public holidays and non-working days for your organization."
      icon={<CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
      titleExtra={
        <>
          {!isLoading && (
            <span className="text-xs font-normal text-muted-foreground tabular-nums">
              {holidayCount}
            </span>
          )}
          <HolidayUsageInfo />
        </>
      }
      action={
        canEdit && !showAdd ? (
          <AnimatedIconButton icon={PlusIcon} iconSize={12} iconClassName="mr-1.5" variant="outline" size="sm" onClick={handleOpenAdd} className="h-7 px-2.5 text-xs shrink-0">
            Add
          </AnimatedIconButton>
        ) : undefined
      }
      contentClassName="space-y-3"
    >
      {showAdd && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleAdd)} className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="gap-1.5">
                    <FormLabel className="text-xs">Holiday name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Republic Day" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="gap-1.5">
                    <FormLabel className="text-xs">Date <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <FormField
                control={form.control}
                name="recurring"
                render={({ field }) => (
                  <FormItem className="gap-0">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <FormControl>
                        <Checkbox
                          id="recurring"
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                          className="bg-card border-border"
                        />
                      </FormControl>
                      <span className="text-sm">Repeat annually</span>
                    </label>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2 sm:ml-auto">
                <LoadingButton type="submit" size="sm" isPending={createMutation.isPending} className="gap-1.5" loadingText="Saving…">
                  Save
                </LoadingButton>
                <Button type="button" variant="ghost" size="sm" onClick={handleCancelAdd}>
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </Form>
      )}

      {isLoading ? (
        <div className="space-y-1.5">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
        </div>
      ) : !holidays || holidays.length === 0 ? (
        <p className="text-sm text-muted-foreground py-3 text-center">No holidays added yet.</p>
      ) : (
        <div className="space-y-0.5 max-h-72 overflow-y-auto">
          {holidays.map((h) => (
            <div key={h.id} className="flex items-center gap-3 px-2.5 py-1.5 rounded-md hover:bg-muted/50 group">
              <div className="flex-1 min-w-0">
                <TruncatedText text={h.name} className="text-sm font-medium" />
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(h.date), "dd MMM yyyy")}
                  {h.recurring && " · Recurring annually"}
                </p>
              </div>
              {canEdit && (
                <DeleteHolidayButton holidayId={h.id} onDelete={handleDelete} disabled={deleteMutation.isPending} />
              )}
            </div>
          ))}
        </div>
      )}
    </OrgSettingsCard>
  );
}
