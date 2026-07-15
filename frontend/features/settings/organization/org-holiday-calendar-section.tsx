"use client";

import { useState, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Trash2, CalendarDays, Plus } from "lucide-react";
import { toast } from "sonner";
import { apiClient, getApiError } from "@/lib/api-client";
import { format, parseISO } from "date-fns";

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
    queryFn: () => apiClient.get<OrgHoliday[]>("/organization/holidays"),
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
    onError: (err) => toast.error(getApiError(err)),
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
    onError: (err) => toast.error(getApiError(err)),
  });
}

interface OrgHolidayCalendarSectionProps {
  canEdit: boolean;
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

  return (
    <Card className="rounded-lg border border-border">
      <CardHeader className="pb-2 flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            Holiday Calendar
          </CardTitle>
          <CardDescription>Public holidays and non-working days for your organization.</CardDescription>
        </div>
        {canEdit && !showAdd && (
          <Button variant="outline" size="sm" onClick={() => setShowAdd(true)} className="gap-1.5 h-8 text-xs">
            <Plus className="h-3 w-3" /> Add
          </Button>
        )}
      </CardHeader>
      <CardContent className="pb-5 space-y-3">
        {showAdd && (
          <form onSubmit={form.handleSubmit(handleAdd)} className="border rounded-lg p-3 space-y-3 bg-muted/30">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Holiday name *</Label>
                <Input {...form.register("name")} placeholder="Republic Day" className="h-8 text-sm" />
                {form.formState.errors.name && <p className="text-[11px] text-destructive">{form.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Date *</Label>
                <Controller
                  name="date"
                  control={form.control}
                  render={({ field }) => (
                    <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="h-8 text-sm" />
                  )}
                />
                {form.formState.errors.date && <p className="text-[11px] text-destructive">{form.formState.errors.date.message}</p>}
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox {...form.register("recurring")} id="recurring" />
              <span className="text-sm">Repeat annually</span>
            </label>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={createMutation.isPending} className="gap-1.5 h-8">
                {createMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => { setShowAdd(false); form.reset(); }}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
          </div>
        ) : !holidays || holidays.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No holidays added yet.</p>
        ) : (
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {holidays.map((h) => (
              <div key={h.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{h.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(h.date), "dd MMM yyyy")}
                    {h.recurring && " · Recurring annually"}
                  </p>
                </div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(h.id)}
                    disabled={deleteMutation.isPending}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          {(holidays?.length ?? 0)} holiday{(holidays?.length ?? 0) !== 1 ? "s" : ""} · Used for attendance, leave, and SLA calculations
        </p>
      </CardContent>
    </Card>
  );
}
