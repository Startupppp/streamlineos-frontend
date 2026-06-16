"use client";

import { useState, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn, resolveImageUrl } from "@/lib/utils";
import { Check, Plus, Target } from "lucide-react";

function getInitials(name: string) {
  return name?.split("").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
}

const targetSchema = z
  .object({
    metricType: z.enum(["calls", "leads_converted", "revenue", "meetings", "deals"]),
    targetValue: z
      .string()
      .min(1, "Target value is required")
      .refine((v) => Number(v) > 0, "Enter a value greater than 0"),
    period: z.enum(["daily", "weekly", "monthly"]),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    notes: z.string().optional().or(z.literal("")),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: "End date must be after start date",
    path: ["endDate"],
  });

type TargetFormValues = z.infer<typeof targetSchema>;

interface Employee {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  image?: string | null;
}

interface CreateTargetSheetProps {
  assignableEmployees: Employee[];
  isPending: boolean;
  onSubmit: (data: {
    userIds: string[];
    metricType: string;
    targetValue: string;
    period: string;
    startDate: string;
    endDate: string;
    notes?: string;
  }) => void;
}

export function CreateTargetSheet({ assignableEmployees, isPending, onSubmit }: CreateTargetSheetProps) {
  const [open, setOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const form = useForm<TargetFormValues>({
    resolver: zodResolver(targetSchema),
    defaultValues: {
      metricType: "calls",
      targetValue: "",
      period: "daily",
      startDate: "",
      endDate: "",
      notes: "",
    },
  });

  const startDate = form.watch("startDate");

  const resetSheet = useCallback(() => {
    setSelectedUserIds([]);
    form.reset();
  }, [form]);

  const handleOpenChange = useCallback((v: boolean) => {
    setOpen(v);
    if (!v) resetSheet();
  }, [resetSheet]);

  const handleCancel = useCallback(() => setOpen(false), []);

  const handleToggleUser = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const userId = e.currentTarget.dataset.userId;
    if (!userId) return;
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }, []);

  const handleSubmit = useCallback(
    (data: TargetFormValues) => {
      onSubmit({
        userIds: selectedUserIds,
        metricType: data.metricType,
        targetValue: data.targetValue,
        period: data.period,
        startDate: data.startDate,
        endDate: data.endDate,
        notes: data.notes || undefined,
      });
      setOpen(false);
      resetSheet();
    },
    [selectedUserIds, onSubmit, resetSheet],
  );

  const employeeNames = useMemo(
    () =>
      new Map(
        assignableEmployees.map((emp) => [
          emp.id,
          emp.firstName ? `${emp.firstName} ${emp.lastName ?? ""}`.trim() : (emp.name ?? "Unknown"),
        ]),
      ),
    [assignableEmployees],
  );

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button className="shadow-lg">
          <Plus className="h-4 w-4 mr-2" />
          Set Target
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col p-0 sm:max-w-[440px]">

        <SheetHeader className="px-6 pt-5 pb-3 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Target className="h-4.5 w-4.5 text-blue-600" />
            </div>
            <div>
              <SheetTitle className="text-lg font-semibold">Set New Target</SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Assign performance targets to team members</p>
            </div>
          </div>
        </SheetHeader>

        <Form {...form}>
          <ScrollArea className="flex-1 min-h-0">
            <form id="create-target-form" onSubmit={form.handleSubmit(handleSubmit)} className="px-6 py-4 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Assign To</Label>
                  {selectedUserIds.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] font-medium">
                      {selectedUserIds.length} selected
                    </Badge>
                  )}
                </div>
                <div className="max-h-40 overflow-y-auto rounded-lg border bg-muted/30 p-1.5 space-y-0.5">
                  {assignableEmployees.map((emp) => {
                    const empName = employeeNames.get(emp.id) ?? "Unknown";
                    const selected = selectedUserIds.includes(emp.id);
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        data-user-id={emp.id}
                        onClick={handleToggleUser}
                        className={cn(
                          "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all text-left",
                          selected ? "bg-blue-500/10 ring-1 ring-blue-500/30" : "hover:bg-muted",
                        )}
                      >
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarImage src={resolveImageUrl(emp.image)} />
                          <AvatarFallback className="text-[10px] font-medium">{getInitials(empName)}</AvatarFallback>
                        </Avatar>
                        <span className={cn("flex-1 truncate", selected && "font-medium")}>{empName}</span>
                        <div className={cn(
                          "h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                          selected ? "border-blue-500 bg-blue-500" : "border-muted-foreground/30",
                        )}>
                          {selected && <Check className="h-3 w-3 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                  {assignableEmployees.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No assignable team members</p>
                  )}
                </div>
              </div>

              <FormField control={form.control} name="metricType" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Metric</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="calls">Total Calls</SelectItem>
                      <SelectItem value="leads_converted">Leads Converted</SelectItem>
                      <SelectItem value="revenue">Revenue Generated</SelectItem>
                      <SelectItem value="meetings">Meetings Booked</SelectItem>
                      <SelectItem value="deals">Deals Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="targetValue" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Target Value</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g. 10" className="h-9" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="period" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Period</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="startDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">Start Date</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value} onChange={field.onChange} placeholder="Start date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="endDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">End Date</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="End date"
                        fromDate={startDate ? new Date(startDate) : undefined}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">
                    Notes <span className="text-muted-foreground font-normal">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add context or instructions..." rows={2} className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </form>
          </ScrollArea>
        </Form>

        <SheetFooter className="px-6 py-3 border-t shrink-0">
          <Button type="button" variant="outline" className="flex-1 h-9" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-target-form"
            className="flex-1 h-9"
            disabled={isPending || selectedUserIds.length === 0}
          >
            {isPending ? "Creating..." : `Create Target${selectedUserIds.length > 1 ? "s" : ""}`}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
