"use client";

import { useState, useCallback } from "react";
import { useRegisterBuildDirtyState } from "@/features/build/navigation/build-dirty-state-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PlusIcon } from "@animateicons/react/lucide";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
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
  SheetClose,
  SheetBody,
} from "@/components/ui/sheet";
import { useCreateProjectTemplate } from "@/hooks/api/build";
import { TicketRow, type TicketDraft } from "./ticket-row";

const CATEGORIES = ["GENERAL", "SOFTWARE", "ONBOARDING", "MARKETING", "SALES", "HR"] as const;

const createTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string(),
  category: z.string(),
});

type CreateTemplateFormValues = z.infer<typeof createTemplateSchema>;

interface CreateTemplateSheetProps {
  open: boolean;
  onClose: () => void;
}

export function CreateTemplateSheet({ open, onClose }: CreateTemplateSheetProps) {
  const [tickets, setTickets] = useState<TicketDraft[]>([
    { title: "", type: "TASK", priority: "MEDIUM", phase: "", estimatedHours: "", order: 0 },
  ]);
  const create = useCreateProjectTemplate();

  const form = useForm<CreateTemplateFormValues>({
    resolver: zodResolver(createTemplateSchema),
    defaultValues: { name: "", description: "", category: "GENERAL" },
  });
  useRegisterBuildDirtyState(open && form.formState.isDirty);

  const addTicket = useCallback(() => {
    setTickets((prev) => [
      ...prev,
      { title: "", type: "TASK", priority: "MEDIUM", phase: "", estimatedHours: "", order: prev.length },
    ]);
  }, []);

  const removeTicket = useCallback((idx: number) => {
    setTickets((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateTicket = useCallback(
    <K extends keyof TicketDraft>(idx: number, field: K, value: TicketDraft[K]) => {
      setTickets((prev) =>
        prev.map((t, i) => (i === idx ? { ...t, [field]: value } : t)),
      );
    },
    [],
  );

  function handleCreate(values: CreateTemplateFormValues) {
    if (tickets.some((t) => !t.title.trim())) {
      toast.error("All task titles are required");
      return;
    }
    create.mutate(
      {
        name: values.name.trim(),
        description: values.description.trim() || undefined,
        category: values.category,
        tickets: tickets.map((t, i) => ({
          title: t.title.trim(),
          type: t.type,
          priority: t.priority,
          phase: t.phase.trim() || undefined,
          estimatedHours: t.estimatedHours ? Number(t.estimatedHours) : undefined,
          order: i,
        })),
      },
      {
        onSuccess: () => {
          toast.success("Template created");
          onClose();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="p-0 flex flex-col gap-0 w-full sm:max-w-lg">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>New Project Template</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleCreate)} className="flex flex-col flex-1 min-h-0">
            <SheetBody className="px-6 py-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Template Name <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g. Software Development" />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="What is this template for?" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <FormLabel>Default Tasks ({tickets.length})</FormLabel>
                  <AnimatedIconButton
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={PlusIcon}
                    iconSize={16}
                    iconClassName="mr-1"
                    onClick={addTicket}
                    className="active:scale-[0.98]"
                  >
                    Add Task
                  </AnimatedIconButton>
                </div>
                {tickets.map((ticket, idx) => (
                  <TicketRow
                    key={idx}
                    ticket={ticket}
                    index={idx}
                    isOnlyTicket={tickets.length <= 1}
                    onUpdate={updateTicket}
                    onRemove={removeTicket}
                  />
                ))}
              </div>
            </SheetBody>
            <div className="shrink-0 px-6 py-4 border-t">
              <div className="grid grid-cols-2 gap-2">
                <SheetClose asChild>
                  <Button type="button" variant="outline" size="sm" className="w-full active:scale-[0.98]">
                    Cancel
                  </Button>
                </SheetClose>
                <LoadingButton
                  type="submit"
                  size="sm"
                  isPending={create.isPending}
                  loadingText="Creating…"
                  className="w-full active:scale-[0.98]"
                >
                  Create Template
                </LoadingButton>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
