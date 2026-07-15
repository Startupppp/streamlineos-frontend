"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetBody,
} from "@/components/ui/sheet";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";

export interface SlaPolicyItem {
  id: number;
  name: string;
  appliesTo: "lead" | "deal" | "both";
  priority: "low" | "medium" | "high" | "urgent";
  firstResponseHours: number;
  resolutionHours: number;
}

const slaPolicySchema = z.object({
  name: z.string().min(1, "Name required").max(100),
  appliesTo: z.enum(["lead", "deal", "both"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  firstResponseHours: z
    .string()
    .min(1, "Required")
    .refine(
      (v) => !isNaN(Number(v)) && Number.isInteger(Number(v)) && Number(v) > 0,
      "Must be a positive whole number"
    ),
  resolutionHours: z
    .string()
    .min(1, "Required")
    .refine(
      (v) => !isNaN(Number(v)) && Number.isInteger(Number(v)) && Number(v) > 0,
      "Must be a positive whole number"
    ),
  businessHours: z.boolean(),
});

export type SlaPolicyFormValues = z.infer<typeof slaPolicySchema>;

function defaultValues(editing: SlaPolicyItem | null): SlaPolicyFormValues {
  if (editing) {
    return {
      name: editing.name,
      appliesTo: editing.appliesTo,
      priority: editing.priority,
      firstResponseHours: String(editing.firstResponseHours),
      resolutionHours: String(editing.resolutionHours),
      businessHours: false,
    };
  }
  return {
    name: "",
    appliesTo: "both",
    priority: "medium",
    firstResponseHours: "4",
    resolutionHours: "24",
    businessHours: false,
  };
}

export function buildSlaPolicyPayload(data: SlaPolicyFormValues) {
  return {
    name: data.name,
    appliesTo: data.appliesTo,
    priority: data.priority,
    firstResponseHours: Number(data.firstResponseHours),
    resolutionHours: Number(data.resolutionHours),
  };
}

interface SlaPolicySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: SlaPolicyItem | null;
  isPending: boolean;
  onSubmit: (data: SlaPolicyFormValues) => void;
}

export function SlaPolicySheet({
  open,
  onOpenChange,
  editing,
  isPending,
  onSubmit,
}: SlaPolicySheetProps) {
  const form = useForm<SlaPolicyFormValues>({
    resolver: zodResolver(slaPolicySchema),
    defaultValues: defaultValues(editing),
  });

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) form.reset(defaultValues(null));
      onOpenChange(next);
    },
    [form, onOpenChange]
  );

  const handleSubmit = useCallback(
    (data: SlaPolicyFormValues) => {
      onSubmit(data);
    },
    [onSubmit]
  );

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
          <SheetTitle>{editing ? "Edit SLA Policy" : "New SLA Policy"}</SheetTitle>
        </SheetHeader>
        <SheetBody className="px-6 py-5">
          <Form {...form}>
            <form id="sla-policy-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Policy Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Hot Lead SLA" className="h-8" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="appliesTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Applies To</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="lead">Lead</SelectItem>
                          <SelectItem value="deal">Deal</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="firstResponseHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Response (hrs)</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="resolutionHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Resolution (hrs)</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="businessHours"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="cursor-pointer">Business Hours Only</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </SheetBody>
        <SheetFooter className="shrink-0 border-t border-border bg-muted/30 px-6 py-4">
          <div className="grid w-full grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <LoadingButton
              type="submit"
              form="sla-policy-form"
              isPending={isPending}
              loadingText="Saving..."
            >
              {editing ? "Save Changes" : "Create Policy"}
            </LoadingButton>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
