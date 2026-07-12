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
} from "@/components/ui/sheet";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Switch } from "@/components/ui/switch";
import type { CustomState } from "@/hooks/api/projects/custom-states";
import type { WorkflowTransition, CreateTransitionInput } from "@/types/projects/workflow";

const ANY_STATUS_SENTINEL = "ANY_STATUS";

const schema = z.object({
  fromStatusId: z.string(),
  toStatusId: z.string().min(1, "Required"),
  name: z.string(),
  requiresApproval: z.boolean(),
  requiredFields: z.string(),
  allowedRoles: z.string(),
});

type FormValues = z.infer<typeof schema>;

interface TransitionFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateTransitionInput) => void;
  isPending?: boolean;
  statuses: CustomState[];
  transition?: WorkflowTransition;
}

export function TransitionFormSheet({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  statuses,
  transition,
}: TransitionFormSheetProps) {
  const isEdit = !!transition;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fromStatusId: ANY_STATUS_SENTINEL,
      toStatusId: "",
      name: "",
      requiresApproval: false,
      requiredFields: "",
      allowedRoles: "",
    },
  });

  useEffect(() => {
    if (open && transition) {
      form.reset({
        fromStatusId:
          transition.fromStatusId != null
            ? String(transition.fromStatusId)
            : ANY_STATUS_SENTINEL,
        toStatusId: String(transition.toStatusId),
        name: transition.name ?? "",
        requiresApproval: transition.requiresApproval,
        requiredFields: transition.requiredFields.join(", "),
        allowedRoles: transition.allowedRoles.join(", "),
      });
    } else if (open && !transition) {
      form.reset({
        fromStatusId: ANY_STATUS_SENTINEL,
        toStatusId: "",
        name: "",
        requiresApproval: false,
        requiredFields: "",
        allowedRoles: "",
      });
    }
  }, [open, transition, form]);

  function splitTrimmed(raw: string): string[] {
    return raw
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function handleSubmit(values: FormValues) {
    const fromStatusId =
      values.fromStatusId === ANY_STATUS_SENTINEL
        ? null
        : parseInt(values.fromStatusId, 10);
    const payload: CreateTransitionInput = {
      fromStatusId,
      toStatusId: parseInt(values.toStatusId, 10),
      name: values.name || undefined,
      requiresApproval: values.requiresApproval,
      requiredFields: splitTrimmed(values.requiredFields),
      allowedRoles: splitTrimmed(values.allowedRoles),
    };
    onSubmit(payload);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) form.reset();
    onOpenChange(nextOpen);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>{isEdit ? "Edit Transition" : "Add Transition"}</SheetTitle>
          <SheetDescription>
            Define which status transitions are allowed in this project.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col flex-1 overflow-y-auto"
          >
            <div className="flex-1 px-6 py-5 space-y-4">
              <FormField
                control={form.control}
                name="fromStatusId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={ANY_STATUS_SENTINEL}>Any status</SelectItem>
                        {statuses.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.name}
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
                name="toStatusId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>To Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statuses.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.name}
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Start review" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="requiresApproval"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                    <div>
                      <FormLabel className="text-sm">Requires approval</FormLabel>
                      <FormDescription className="text-xs">
                        Block the transition until an approval is granted.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="requiredFields"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Required fields (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. assignee, due_date" />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Comma-separated field names that must be set before transitioning.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="allowedRoles"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Allowed roles (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. developer, manager" />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Comma-separated role names. Empty means all roles.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <SheetFooter className="px-6 py-4 border-t shrink-0">
              <div className="grid w-full grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenChange(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <LoadingButton type="submit" size="sm" isPending={isPending} loadingText="Saving…">
                  {isEdit ? "Save changes" : "Add transition"}
                </LoadingButton>
              </div>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
