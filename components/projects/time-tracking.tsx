"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Clock, Plus } from "lucide-react";
import { useTimeEntries, useAddTimeEntry } from "@/lib/hooks/trpc-hooks";
import { toast } from "sonner";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const timeEntrySchema = z.object({
  date: z.date(),
  hours: z.number().positive("Hours must be positive"),
  description: z.string().optional(),
});

type TimeEntryForm = z.infer<typeof timeEntrySchema>;

interface TimeTrackingProps {
  ticketId: number;
}

export function TimeTracking({ ticketId }: TimeTrackingProps) {
  const [open, setOpen] = useState(false);

  const { data: entries, isLoading } = useTimeEntries(ticketId);

  const addTimeEntry = useAddTimeEntry({
    onSuccess: () => {
      toast.success("Time entry added");
      setOpen(false);
      reset();
    },
    onError: () => {
      toast.error("Failed to add time entry");
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TimeEntryForm>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: {
      date: new Date(),
      hours: 0,
      description: "",
    },
  });

  const onSubmit = (data: TimeEntryForm) => {
    addTimeEntry.mutate({
      ticketId,
      date: data.date,
      hours: data.hours,
      description: data.description,
    });
  };

  const totalHours =
    entries?.reduce((sum, e) => sum + parseFloat(e.hours || "0"), 0) || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Tracking
          </CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Entry
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Time Entry</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    {...register("date", { valueAsDate: true })}
                    defaultValue={format(new Date(), "yyyy-MM-dd")}
                  />
                  {errors.date && (
                    <p className="text-sm text-red-500">
                      {errors.date.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Hours</Label>
                  <Input
                    type="number"
                    step="0.25"
                    min="0.25"
                    {...register("hours", { valueAsNumber: true })}
                  />
                  {errors.hours && (
                    <p className="text-sm text-red-500">
                      {errors.hours.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Description (optional)</Label>
                  <Textarea {...register("description")} />
                </div>
                <Button type="submit" disabled={addTimeEntry.isPending}>
                  {addTimeEntry.isPending ? "Adding..." : "Add Entry"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <p className="text-2xl font-bold">{totalHours.toFixed(2)}</p>
          <p className="text-sm text-muted-foreground">Total hours logged</p>
        </div>
        {isLoading ? (
          <div>Loading entries...</div>
        ) : entries && entries.length > 0 ? (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-2 border rounded"
              >
                <div>
                  <p className="font-medium">
                    {format(new Date(entry.date), "MMM dd, yyyy")}
                  </p>
                  {entry.description && (
                    <p className="text-sm text-muted-foreground">
                      {entry.description}
                    </p>
                  )}
                </div>
                <p className="font-semibold">
                  {parseFloat(entry.hours || "0").toFixed(2)}h
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No time entries yet</p>
        )}
      </CardContent>
    </Card>
  );
}
