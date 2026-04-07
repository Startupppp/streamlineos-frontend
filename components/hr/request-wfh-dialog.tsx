"use client";

import { useState, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useHrEmployees, useCreateWfhRequest } from "@/lib/api/hooks/hr";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
import { Home, Loader2 } from "lucide-react";
import { format, addDays } from "date-fns";
import type { Employee } from "@/types/hr";

const wfhFormSchema = z.object({
  date: z.string().min(1, "Date is required"),
  reason: z.string().optional(),
  approverId: z.string().min(1, "Approver is required"),
});

type WfhFormValues = z.infer<typeof wfhFormSchema>;

export function RequestWfhDialog({ trigger }: { trigger?: React.ReactNode } = {}) {
  const [open, setOpen] = useState(false);

  const { data: employeesRaw } = useHrEmployees();
  const employees = useMemo(
    () =>
      (Array.isArray(employeesRaw)
        ? employeesRaw
        : (employeesRaw as { data?: Employee[] })?.data ?? []) as Employee[],
    [employeesRaw]
  );
  const approvers = useMemo(
    () => employees.filter((e) => e.role === "ADMIN" || e.role === "CEO"),
    [employees]
  );

  const form = useForm<WfhFormValues>({
    resolver: zodResolver(wfhFormSchema),
    defaultValues: {
      date: format(addDays(new Date(), 1), "yyyy-MM-dd"),
      reason: "",
      approverId: "",
    },
  });

  const createWfhRequest = useCreateWfhRequest();

  const handleClose = useCallback(() => {
    setOpen(false);
    form.reset();
  }, [form]);

  const onSubmit = useCallback((data: WfhFormValues) => {
    createWfhRequest.mutate(
      {
        date: new Date(data.date),
        reason: data.reason || undefined,
        approverId: data.approverId,
      },
      {
        onSuccess: () => {
          toast.success("Work from home request submitted");
          handleClose();
        },
        onError: (error) => {
          toast.error(error.message || "Failed to submit WFH request");
        },
      }
    );
  }, [createWfhRequest, handleClose]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button variant="outline">
            <Home className="mr-2 h-4 w-4" />
            Request WFH
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="flex flex-col p-0 sm:max-w-md">
        <SheetHeader className="px-4 pt-4 pb-3 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2 text-sm">
            <Home className="h-4 w-4 text-primary" />
            Work From Home Request
          </SheetTitle>
          <SheetDescription className="text-xs">
            Request to work from home for a specific date.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <Form {...form}>
            <form
              id="wfh-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="px-4 py-3 space-y-3"
            >
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value} onChange={field.onChange} className="w-full" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="approverId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Approver</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select approver" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {approvers.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name ||
                              `${u.firstName || ""} ${u.lastName || ""}`.trim() ||
                              u.email}
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
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., Internet maintenance at home..."
                        className="resize-none w-full"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </ScrollArea>

        <SheetFooter className="px-4 pb-4 pt-3 gap-2 shrink-0 border-t flex-row">
          <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="wfh-form"
            className="flex-1"
            disabled={createWfhRequest.isPending}
          >
            {createWfhRequest.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Submit Request
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
