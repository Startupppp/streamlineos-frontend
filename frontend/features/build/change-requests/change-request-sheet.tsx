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
  SheetFooter,
  SheetClose,
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
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import dynamic from "next/dynamic";

const TiptapEditor = dynamic(
  () => import("@/components/editor/tiptap-editor").then((m) => ({ default: m.TiptapEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-md border border-input bg-background animate-pulse min-h-[120px]" />
    ),
  },
);
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateChangeRequest, useUpdateChangeRequest } from "@/hooks/api/build/change-requests";
import { ProjectMemberSelect } from "@/components/members/project-member-select";
import type { ChangeRequest, ChangeRequestStatus } from "@/types/projects";

const CR_STATUSES: ChangeRequestStatus[] = [
  "submitted", "under_review", "estimated", "awaiting_approval",
  "approved", "rejected", "in_progress", "completed",
];

const CR_STATUS_LABELS: Record<ChangeRequestStatus, string> = {
  submitted: "Submitted", under_review: "Under Review", estimated: "Estimated",
  awaiting_approval: "Awaiting Approval", approved: "Approved", rejected: "Rejected",
  in_progress: "In Progress", completed: "Completed",
};

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string(),
  impact: z.string(),
  status: z.string(),
  estimateHours: z.string(),
  budgetRs: z.string(),
  timelineDays: z.string(),
  approvalOwnerId: z.string(),
  decisionComment: z.string(),
});

type FormValues = z.infer<typeof schema>;

const DEFAULTS: FormValues = {
  title: "", description: "", impact: "", status: "submitted",
  estimateHours: "", budgetRs: "", timelineDays: "", approvalOwnerId: "none", decisionComment: "",
};

interface ChangeRequestSheetProps {
  projectId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editCr: ChangeRequest | null;
}

export function ChangeRequestSheet({ projectId, open, onOpenChange, editCr }: ChangeRequestSheetProps) {
  const create = useCreateChangeRequest(projectId);
  const update = useUpdateChangeRequest(projectId);

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });

  useEffect(() => {
    if (!open) return;
    if (editCr) {
      form.reset({
        title: editCr.title,
        description: editCr.description ?? "",
        impact: editCr.impact ?? "",
        status: editCr.status,
        estimateHours: editCr.estimateMinutes != null ? String(editCr.estimateMinutes / 60) : "",
        budgetRs: editCr.budgetImpactCents != null ? String(editCr.budgetImpactCents / 100) : "",
        timelineDays: editCr.timelineImpactDays != null ? String(editCr.timelineImpactDays) : "",
        approvalOwnerId: editCr.approvalOwnerId ?? "none",
        decisionComment: editCr.decisionComment ?? "",
      });
    } else {
      form.reset(DEFAULTS);
    }
  }, [open, editCr, form]);

  function handleSubmit(values: FormValues) {
    const estimateMinutes = values.estimateHours
      ? Math.round(parseFloat(values.estimateHours) * 60)
      : undefined;
    const budgetImpactCents = values.budgetRs
      ? Math.round(parseFloat(values.budgetRs) * 100)
      : undefined;
    const timelineImpactDays = values.timelineDays ? parseInt(values.timelineDays, 10) : undefined;

    const payload = {
      title: values.title,
      description: values.description || undefined,
      impact: values.impact || undefined,
      status: CR_STATUSES.find((s) => s === values.status),
      estimateMinutes,
      budgetImpactCents,
      timelineImpactDays,
      approvalOwnerId: values.approvalOwnerId !== "none" ? values.approvalOwnerId : undefined,
      decisionComment: values.decisionComment || undefined,
    };

    if (editCr) {
      update.mutate({ ...payload, id: editCr.id }, {
        onSuccess: () => { toast.success("Change request updated"); onOpenChange(false); },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    } else {
      create.mutate({ title: payload.title, description: payload.description, impact: payload.impact }, {
        onSuccess: () => { toast.success("Change request created"); onOpenChange(false); },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    }
  }

  const isPending = create.isPending || update.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 flex flex-col w-full sm:max-w-lg">
        <SheetHeader className="px-5 py-4 border-b shrink-0">
          <SheetTitle>{editCr ? `Edit CR-${editCr.crNumber}` : "New Change Request"}</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form id="cr-form" onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
            <SheetBody>
              <div className="px-5 py-4 space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-dense">Title <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input {...field} className="text-dense" placeholder="Describe the change" />
                      </FormControl>
                      <FormMessage className="text-micro" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-dense">Description</FormLabel>
                      <FormControl>
                        <TiptapEditor
                          content={field.value}
                          output="html"
                          onChangeHtml={field.onChange}
                          placeholder="What needs to change and why..."
                          minHeightClassName="min-h-[80px]"
                          contentKey={editCr?.id ?? "new"}
                          menuMode="static"
                        />
                      </FormControl>
                      <FormMessage className="text-micro" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="impact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-dense">Impact</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          className="text-dense min-h-[60px] resize-none"
                          placeholder="Impact on scope, schedule, or cost..."
                        />
                      </FormControl>
                      <FormMessage className="text-micro" />
                    </FormItem>
                  )}
                />
                {editCr && (
                  <>
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-dense">Status</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CR_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>{CR_STATUS_LABELS[s]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-micro" />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-3 gap-3">
                      <FormField
                        control={form.control}
                        name="estimateHours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-dense">Estimate (hrs)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" step="0.5" className="text-dense" placeholder="0" />
                            </FormControl>
                            <FormMessage className="text-micro" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="budgetRs"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-dense">Budget (₹)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" step="1" className="text-dense" placeholder="0" />
                            </FormControl>
                            <FormMessage className="text-micro" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="timelineDays"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-dense">Timeline (days)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" className="text-dense" placeholder="0" />
                            </FormControl>
                            <FormMessage className="text-micro" />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="approvalOwnerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-dense">Approval Owner</FormLabel>
                          <ProjectMemberSelect
                            projectId={projectId}
                            mode="single"
                            value={field.value === "none" ? "" : field.value}
                            onChange={(v) => field.onChange(v ?? "none")}
                            allowUnassigned
                            placeholder="Unassigned"
                            className="text-dense"
                          />
                          <FormMessage className="text-micro" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="decisionComment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-dense">Decision Comment</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              className="text-dense min-h-[56px] resize-none"
                              placeholder="Approve/reject reasoning..."
                            />
                          </FormControl>
                          <FormMessage className="text-micro" />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>
            </SheetBody>
            <SheetFooter className="px-5 py-3 border-t shrink-0">
              <div className="grid w-full grid-cols-2 gap-2">
                <SheetClose asChild>
                  <Button variant="outline" size="sm" className="text-dense">Cancel</Button>
                </SheetClose>
                <LoadingButton type="submit" size="sm" className="text-dense" isPending={isPending} loadingText="Saving…">
                  {editCr ? "Save Changes" : "Create"}
                </LoadingButton>
              </div>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
