"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRequestLeave } from "../../lib/hooks/trpc-hooks";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Plus, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { differenceInCalendarDays } from "date-fns";
import { LEAVE_MAX_DAYS } from "@/lib/leave-policy";

interface LeaveRequestFormProps {
  types?: { id: number; name: string }[];
}

type FormValues = {
  typeId: string;
  startDate: string;
  endDate: string;
  reason: string;
};

export function LeaveRequestForm({ types = [] }: LeaveRequestFormProps) {
  const [open, setOpen] = useState(false);

  const requestLeaveMutation = useRequestLeave({
    onSuccess: () => {
      toast.success("Leave request submitted successfully");
      setOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit request");
    },
  });

  const formSchema = z
    .object({
      typeId: z.string().min(1, "Leave type is required"),
      startDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
      endDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
      reason: z.string().min(1, "Reason is required"),
    })
    .refine(
      (data) => {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        return end >= start;
      },
      {
        message: "End date must be after or equal to start date",
        path: ["endDate"],
      }
    );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      typeId: "",
      startDate: "",
      endDate: "",
      reason: "",
    },
  });

  /* ─── Issue #137: Leave day limit validation ─── */
  const watchedTypeId = form.watch("typeId");
  const watchedStartDate = form.watch("startDate");
  const watchedEndDate = form.watch("endDate");

  const leaveDayLimitError = useMemo(() => {
    if (!watchedTypeId || !watchedStartDate || !watchedEndDate) return null;
    const selectedType = types.find((t) => t.id.toString() === watchedTypeId);
    if (!selectedType) return null;
    const maxDays = LEAVE_MAX_DAYS[selectedType.name];
    if (maxDays === undefined) return null;
    const days = differenceInCalendarDays(new Date(watchedEndDate), new Date(watchedStartDate)) + 1;
    if (days > maxDays) {
      return `${selectedType.name} cannot exceed ${maxDays} days per year. You have selected ${days} day${days !== 1 ? "s" : ""}.`;
    }
    return null;
  }, [watchedTypeId, watchedStartDate, watchedEndDate, types]);

  const onSubmit = (values: FormValues) => {
    if (leaveDayLimitError) {
      toast.error(leaveDayLimitError);
      return;
    }
    requestLeaveMutation.mutate({
      typeId: parseInt(values.typeId),
      startDate: values.startDate,
      endDate: values.endDate,
      reason: values.reason,
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="bg-primary text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" /> Request Leave
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-[425px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Request Leave</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4 py-4"
          >
            <FormField
              control={form.control}
              name="typeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Leave Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {types.map((type) => (
                        <SelectItem key={type.id} value={type.id.toString()}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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
                    <Textarea {...field} placeholder="Going to hometown..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Issue #137: Day limit warning */}
            {leaveDayLimitError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-xs text-red-600 dark:text-red-400">{leaveDayLimitError}</p>
              </div>
            )}
            <div className="flex justify-end">
              <Button type="submit" disabled={requestLeaveMutation.isPending || !!leaveDayLimitError}>
                {requestLeaveMutation.isPending
                  ? "Submitting..."
                  : "Submit Request"}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
