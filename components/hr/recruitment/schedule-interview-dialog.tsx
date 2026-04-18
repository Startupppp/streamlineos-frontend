"use client";

import { useState, useCallback } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ChevronDown, Video, Phone, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreateInterview } from "@/lib/api/hooks/hr/recruitment";


const scheduleSchema = z.object({
  scheduledAt: z.string().min(1, "Date/time required"),
  durationMinutes: z.coerce.number().int().min(15).max(480),
  format: z.enum(["VIDEO", "PHONE", "IN_PERSON"]),
  notes: z.string().max(2000).optional(),
  notifyEmail: z.boolean(),
});

type ScheduleFormValues = z.infer<typeof scheduleSchema>;


export interface ScheduleInterviewDialogProps {
  candidateId: number;
  candidateName: string;
  jobPostingId?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}


const FORMAT_OPTIONS = [
  { value: "VIDEO" as const, label: "Video", Icon: Video },
  { value: "PHONE" as const, label: "Phone", Icon: Phone },
  { value: "IN_PERSON" as const, label: "In-Person", Icon: MapPin },
];

const DURATION_OPTIONS = [
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "60 min" },
  { value: "90", label: "90 min" },
  { value: "120", label: "120 min" },
];


function formatToInterviewType(format: "VIDEO" | "PHONE" | "IN_PERSON") {
  if (format === "IN_PERSON") return "ONSITE" as const;
  return format as "VIDEO" | "PHONE";
}


export function ScheduleInterviewDialog({
  candidateId,
  candidateName,
  jobPostingId,
  open,
  onOpenChange,
}: ScheduleInterviewDialogProps) {
  const [notesOpen, setNotesOpen] = useState(false);
  const createInterview = useCreateInterview();

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema) as any,
    defaultValues: {
      scheduledAt: "",
      durationMinutes: 60,
      format: "VIDEO",
      notes: "",
      notifyEmail: true,
    },
  });

  const handleClose = useCallback(() => {
    form.reset();
    setNotesOpen(false);
    onOpenChange(false);
  }, [form, onOpenChange]);

  const onSubmit = useCallback(
    (values: ScheduleFormValues) => {
      createInterview.mutate(
        {
          candidateId,
          jobPostingId,
          type: formatToInterviewType(values.format),
          scheduledAt: new Date(values.scheduledAt).toISOString(),
          duration: values.durationMinutes,
          notes: values.notes || undefined,
        },
        {
          onSuccess: () => {
            toast.success("Interview scheduled");
            handleClose();
          },
          onError: () => {
            toast.error("Failed to schedule interview. Please try again.");
          },
        }
      );
    },
    [candidateId, jobPostingId, createInterview, handleClose]
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Schedule Interview — {candidateName}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="scheduledAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date &amp; Time</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      {...field}
                      aria-label="Interview date and time"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="durationMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(Number(v))}
                    defaultValue={String(field.value)}
                  >
                    <FormControl>
                      <SelectTrigger aria-label="Interview duration">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DURATION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="format"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Format</FormLabel>
                  <FormControl>
                    <div className="flex gap-2" role="group" aria-label="Interview format">
                      {FORMAT_OPTIONS.map(({ value, label, Icon }) => {
                        const selected = field.value === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => field.onChange(value)}
                            aria-pressed={selected}
                            className={cn(
                              "flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                              selected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-input bg-background text-foreground hover:bg-muted"
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <button
                type="button"
                onClick={() => setNotesOpen((v) => !v)}
                className="flex w-full items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                aria-expanded={notesOpen}
                aria-controls="interview-notes-panel"
              >
                <span>Notes (optional)</span>
                <ChevronDown
                  className={cn("h-4 w-4 transition-transform duration-200", notesOpen && "rotate-180")}
                />
              </button>

              {notesOpen && (
                <div id="interview-notes-panel" className="pt-2">
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            placeholder="Add any notes or instructions for the interviewer…"
                            rows={3}
                            className="resize-none"
                            aria-label="Interview notes"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="notifyEmail"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      id="notify-email"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel htmlFor="notify-email" className="cursor-pointer font-normal">
                    Send email notification to candidate
                  </FormLabel>
                </FormItem>
              )}
            />

            <DialogFooter className="flex flex-row gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleClose}
                disabled={createInterview.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={createInterview.isPending}
              >
                {createInterview.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Schedule
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
