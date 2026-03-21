"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Home, Loader2 } from "lucide-react";
import { format, addDays } from "date-fns";

const wfhFormSchema = z.object({
  date: z.string().min(1, "Date is required"),
  reason: z.string().optional(),
  approverId: z.string().min(1, "Approver is required"),
});

type WfhFormValues = z.infer<typeof wfhFormSchema>;

export function RequestWfhDialog({ trigger }: { trigger?: React.ReactNode } = {}) {
  const [open, setOpen] = useState(false);
  const utils = api.useUtils();

  const { data: members } = api.project.getProjectMembers.useQuery();
  const approvers = (members || []).filter(
    (m) => m.role === "ADMIN" || m.role === "CEO"
  );

  const form = useForm<WfhFormValues>({
    resolver: zodResolver(wfhFormSchema),
    defaultValues: {
      date: format(addDays(new Date(), 1), "yyyy-MM-dd"),
      reason: "",
      approverId: "",
    },
  });

  const createWfhRequest = api.hr.createWfhRequest.useMutation({
    onSuccess: () => {
      toast.success("Work from home request submitted");
      utils.hr.getWfhRequests.invalidate();
      utils.hr.getPendingWfhRequests.invalidate();
      setOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit WFH request");
    },
  });

  function onSubmit(data: WfhFormValues) {
    createWfhRequest.mutate({
      date: new Date(data.date),
      reason: data.reason || undefined,
      approverId: data.approverId,
    });
  }

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
      <SheetContent className="sm:max-w-lg overflow-y-auto p-6">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            Work From Home Request
          </SheetTitle>
          <SheetDescription>
            Request to work from home for a specific date.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormDescription>
                    Select the date you want to work from home
                  </FormDescription>
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
                      <SelectTrigger>
                        <SelectValue placeholder="Select approver" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {approvers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Who should approve this request?
                  </FormDescription>
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
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-5 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createWfhRequest.isPending}>
                {createWfhRequest.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Submit Request
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
