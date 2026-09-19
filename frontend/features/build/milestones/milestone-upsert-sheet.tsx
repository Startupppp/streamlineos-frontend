"use client";

import { useCallback } from "react";
import { useRegisterBuildDirtyState } from "@/features/build/navigation/build-dirty-state-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetBody,
} from "@/components/ui/sheet";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
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
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useCreateMilestone,
  useUpdateMilestone,
  type ProjectMilestone,
} from "@/hooks/api/build";

const milestoneSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name is too long"),
  description: z.string().optional(),
  targetDate: z.string().min(1, "Target date is required").regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  status: z.enum(["PENDING", "ACHIEVED", "MISSED"]),
});

type MilestoneFormValues = z.infer<typeof milestoneSchema>;

interface MilestoneUpsertSheetProps {
  projectId: number;
  milestone?: ProjectMilestone;
  onClose: () => void;
}

export function MilestoneUpsertSheet({ projectId, milestone, onClose }: MilestoneUpsertSheetProps) {
  const isEdit = !!milestone;
  const create = useCreateMilestone(projectId);
  const update = useUpdateMilestone(projectId);
  const isPending = create.isPending || update.isPending;

  const form = useForm<MilestoneFormValues>({
    resolver: zodResolver(milestoneSchema),
    defaultValues: {
      name: milestone?.name ?? "",
      description: milestone?.description ?? "",
      targetDate: milestone?.targetDate ?? "",
      status: milestone?.status ?? "PENDING",
    },
  });
  useRegisterBuildDirtyState(form.formState.isDirty);

  const targetDateValue = form.watch("targetDate");

  const handleTargetDateChange = useCallback(
    (val: string) => form.setValue("targetDate", val, { shouldValidate: true }),
    [form],
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) onClose();
    },
    [onClose],
  );

  const onSubmit = useCallback(
    (values: MilestoneFormValues) => {
      const payload = {
        name: values.name,
        description: values.description?.trim() || undefined,
        targetDate: values.targetDate,
        status: values.status,
      };

      if (isEdit) {
        update.mutate(
          { milestoneId: milestone.id, ...payload },
          {
            onSuccess: () => { toast.success("Milestone updated"); onClose(); },
            onError: (err) => toast.error(getErrorMessage(err)),
          },
        );
      } else {
        create.mutate(
          payload,
          {
            onSuccess: () => { toast.success("Milestone created"); onClose(); },
            onError: (err) => toast.error(getErrorMessage(err)),
          },
        );
      }
    },
    [isEdit, milestone, create, update, onClose],
  );

  return (
    <Sheet open onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>{isEdit ? "Edit Milestone" : "New Milestone"}</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <SheetBody className="px-6 py-5 space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. MVP Launch" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="Optional description…" className="resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="targetDate"
                  render={() => (
                    <FormItem>
                      <FormLabel>Target Date *</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={targetDateValue}
                          onChange={handleTargetDateChange}
                          placeholder="Pick a date"
                          className="text-sm"
                          disablePast
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PENDING">Pending</SelectItem>
                          <SelectItem value="ACHIEVED">Achieved</SelectItem>
                          <SelectItem value="MISSED">Missed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </SheetBody>

            <SheetFooter className="px-6 py-4 border-t shrink-0">
              <div className="grid w-full grid-cols-2 gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <LoadingButton type="submit" isPending={isPending} loadingText="Saving…">
                  {isEdit ? "Save Changes" : "Create Milestone"}
                </LoadingButton>
              </div>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
