"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { toast } from "sonner";
import { useCreateChangeRequest, useUpdateChangeRequest } from "@/hooks/api/projects/change-requests";
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
      status: (values.status as ChangeRequestStatus) || undefined,
      estimateMinutes,
      budgetImpactCents,
      timelineImpactDays,
      approvalOwnerId: values.approvalOwnerId !== "none" ? values.approvalOwnerId : undefined,
      decisionComment: values.decisionComment || undefined,
    };

    if (editCr) {
      update.mutate({ ...payload, id: editCr.id }, {
        onSuccess: () => { toast.success("Change request updated"); onOpenChange(false); },
        onError: () => toast.error("Failed to update change request"),
      });
    } else {
      create.mutate({ title: payload.title, description: payload.description, impact: payload.impact }, {
        onSuccess: () => { toast.success("Change request created"); onOpenChange(false); },
        onError: () => toast.error("Failed to create change request"),
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
        <ScrollArea className="flex-1">
          <form id="cr-form" onSubmit={form.handleSubmit(handleSubmit)} className="px-5 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[11px]">Title *</Label>
              <Input {...form.register("title")} className="h-8 text-[11px]" placeholder="Describe the change" />
              {form.formState.errors.title && (
                <p className="text-[10px] text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px]">Description</Label>
              <TiptapEditor
                content={form.watch("description")}
                output="html"
                onChangeHtml={(v) => form.setValue("description", v)}
                placeholder="What needs to change and why..."
                minHeightClassName="min-h-[80px]"
                contentKey={editCr?.id ?? "new"}
                menuMode="static"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px]">Impact</Label>
              <Textarea
                {...form.register("impact")}
                className="text-[11px] min-h-[60px] resize-none"
                placeholder="Impact on scope, schedule, or cost..."
              />
            </div>
            {editCr && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-[11px]">Status</Label>
                  <Select value={form.watch("status")} onValueChange={(v) => form.setValue("status", v)}>
                    <SelectTrigger className="h-8 text-[11px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CR_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{CR_STATUS_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px]">Estimate (hrs)</Label>
                    <Input {...form.register("estimateHours")} type="number" step="0.5" className="h-8 text-[11px]" placeholder="0" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px]">Budget (₹)</Label>
                    <Input {...form.register("budgetRs")} type="number" step="1" className="h-8 text-[11px]" placeholder="0" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px]">Timeline (days)</Label>
                    <Input {...form.register("timelineDays")} type="number" className="h-8 text-[11px]" placeholder="0" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px]">Approval Owner</Label>
                  <ProjectMemberSelect
                    projectId={projectId}
                    mode="single"
                    value={form.watch("approvalOwnerId") === "none" ? "" : form.watch("approvalOwnerId")}
                    onChange={(v) => form.setValue("approvalOwnerId", v ?? "none")}
                    allowUnassigned
                    placeholder="Unassigned"
                    className="h-8 text-[11px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px]">Decision Comment</Label>
                  <Textarea
                    {...form.register("decisionComment")}
                    className="text-[11px] min-h-[56px] resize-none"
                    placeholder="Approve/reject reasoning..."
                  />
                </div>
              </>
            )}
          </form>
        </ScrollArea>
        <SheetFooter className="px-5 py-3 border-t shrink-0 flex gap-2">
          <SheetClose asChild>
            <Button variant="outline" size="sm" className="text-[11px]">Cancel</Button>
          </SheetClose>
          <Button type="submit" form="cr-form" size="sm" className="text-[11px]" disabled={isPending}>
            {isPending ? "Saving..." : editCr ? "Save Changes" : "Create"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
