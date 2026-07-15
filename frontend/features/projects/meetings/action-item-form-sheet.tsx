"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetBody,
} from "@/components/ui/sheet";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { getUserDisplayName } from "@/features/projects/shared/resolve-user-name";
import type { ActionItem, CreateActionItemInput, UpdateActionItemInput, ProjectMemberRecord } from "@/types/projects";

const NONE_SENTINEL = "__none__";

const actionItemSchema = z.object({
  title: z.string().min(1, "Required").max(200),
  description: z.string(),
  assigneeId: z.string(),
  dueDate: z.string(),
  status: z.enum(["open", "in_progress", "done", "converted", "cancelled"]),
});

type ActionItemFormValues = z.infer<typeof actionItemSchema>;

const CREATE_DEFAULTS: ActionItemFormValues = {
  title: "",
  description: "",
  assigneeId: NONE_SENTINEL,
  dueDate: "",
  status: "open",
};

function itemToFormValues(item: ActionItem): ActionItemFormValues {
  return {
    title: item.title,
    description: item.description ?? "",
    assigneeId: item.assigneeId ?? NONE_SENTINEL,
    dueDate: item.dueDate ? item.dueDate.slice(0, 10) : "",
    status: item.status,
  };
}

interface ActionItemFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  defaultValues?: ActionItem;
  onSubmitCreate: (input: CreateActionItemInput) => void;
  onSubmitEdit: (input: UpdateActionItemInput) => void;
  isPending: boolean;
  projectMembers: ProjectMemberRecord[];
}

export function ActionItemFormSheet({
  open, onOpenChange, mode, defaultValues, onSubmitCreate, onSubmitEdit, isPending, projectMembers,
}: ActionItemFormSheetProps) {
  const form = useForm<ActionItemFormValues>({
    resolver: zodResolver(actionItemSchema),
    defaultValues: CREATE_DEFAULTS,
  });

  useEffect(() => {
    if (open) {
      form.reset(mode === "edit" && defaultValues ? itemToFormValues(defaultValues) : CREATE_DEFAULTS);
    }
  }, [open, mode, defaultValues, form]);

  function handleSubmit(values: ActionItemFormValues) {
    const assigneeId = values.assigneeId === NONE_SENTINEL ? undefined : values.assigneeId;
    const dueDate = values.dueDate || undefined;
    const description = values.description || undefined;
    if (mode === "edit" && defaultValues) {
      onSubmitEdit({
        id: defaultValues.id,
        title: values.title,
        description: description ?? null,
        assigneeId: assigneeId ?? null,
        dueDate: dueDate ?? null,
        status: values.status,
      });
    } else {
      onSubmitCreate({ title: values.title, description, assigneeId, dueDate, status: values.status });
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>{mode === "edit" ? "Edit Action Item" : "New Action Item"}</SheetTitle>
          <SheetDescription>
            {mode === "edit" ? "Update the action item." : "Add a new action item to this meeting."}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
            <SheetBody className="px-6 py-5 space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input {...field} placeholder="Action item title" className="h-8 text-sm" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl><Textarea {...field} rows={3} placeholder="More details…" className="text-sm resize-none" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="assigneeId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignee</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Unassigned" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value={NONE_SENTINEL}>Unassigned</SelectItem>
                        {projectMembers.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{getUserDisplayName(m)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="dueDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date (optional)</FormLabel>
                  <FormControl>
                    <DatePicker value={field.value} onChange={field.onChange} placeholder="Select due date" className="h-8 text-sm" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </SheetBody>
            <SheetFooter className="shrink-0 px-6 py-4 border-t">
              <div className="grid w-full grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <LoadingButton type="submit" isPending={isPending} loadingText="Saving…">
                  {mode === "edit" ? "Save Changes" : "Add Item"}
                </LoadingButton>
              </div>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
