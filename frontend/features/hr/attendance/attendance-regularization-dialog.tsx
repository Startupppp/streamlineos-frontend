"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateRegularization } from "@/hooks/api/hr/attendance";
import { FilePen } from "lucide-react";

const regularizationSchema = z.object({
  attendanceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  requestedCheckIn: z.string().optional(),
  requestedCheckOut: z.string().optional(),
  reason: z.string().min(10, "Reason must be at least 10 characters").max(500),
});

type RegularizationFormValues = z.infer<typeof regularizationSchema>;

export function AttendanceRegularizationDialog({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const form = useForm<RegularizationFormValues>({
    resolver: zodResolver(regularizationSchema),
    defaultValues: {
      attendanceDate: new Date().toISOString().slice(0, 10),
      reason: "",
    },
  });

  const mutation = useCreateRegularization({
    onSuccess: () => {
      toast.success("Regularization request submitted");
      setOpen(false);
      form.reset();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function onSubmit(values: RegularizationFormValues) {
    const payload: Parameters<typeof mutation.mutate>[0] = {
      attendanceDate: values.attendanceDate,
      reason: values.reason,
    };
    if (values.requestedCheckIn) {
      const [h, m] = values.requestedCheckIn.split(":");
      const d = new Date(values.attendanceDate + "T00:00:00");
      d.setHours(Number(h), Number(m), 0, 0);
      payload.requestedCheckIn = d.toISOString();
    }
    if (values.requestedCheckOut) {
      const [h, m] = values.requestedCheckOut.split(":");
      const d = new Date(values.attendanceDate + "T00:00:00");
      d.setHours(Number(h), Number(m), 0, 0);
      payload.requestedCheckOut = d.toISOString();
    }
    mutation.mutate(payload);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <FilePen className="h-4 w-4" />
            Request Correction
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Attendance Correction</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="attendanceDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="requestedCheckIn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check-in Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="requestedCheckOut"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check-out Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Explain why this correction is needed..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-1">
              <LoadingButton type="submit" isPending={mutation.isPending} loadingText="Submitting...">
                Submit Request
              </LoadingButton>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
