"use client";

import { useState, useCallback } from "react";
import { useEmailSequences, useCreateEmailSequence, useUpdateEmailSequence, useDeleteEmailSequence } from "@/lib/api/hooks/hr/recruitment/email-sequences";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyMailIllustration } from "@/components/illustrations";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { format } from "date-fns";
import type { EmailSequence, EmailSequenceTrigger } from "@/types/hr/recruitment";

const TRIGGER_LABELS: Record<EmailSequenceTrigger, string> = {
  MANUAL: "Manual",
  CANDIDATE_ADDED: "Candidate Added",
  APPLICATION_RECEIVED: "Application Received",
  STAGE_CHANGED: "Stage Changed",
  OFFER_SENT: "Offer Sent",
};

interface StepDraft {
  stepOrder: number;
  delayDays: number;
  subject: string;
  htmlBody: string;
}

interface StepRowProps {
  step: StepDraft;
  index: number;
  onUpdate: (index: number, field: keyof StepDraft, value: string | number) => void;
  onRemove: (index: number) => void;
}

function StepRow({ step, index, onUpdate, onRemove }: StepRowProps) {
  function handleDelayChange(e: React.ChangeEvent<HTMLInputElement>) {
    onUpdate(index, "delayDays", Number(e.target.value));
  }
  function handleSubjectChange(e: React.ChangeEvent<HTMLInputElement>) {
    onUpdate(index, "subject", e.target.value);
  }
  function handleBodyChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    onUpdate(index, "htmlBody", e.target.value);
  }
  function handleRemove() { onRemove(index); }

  return (
    <div className="border rounded-lg p-4 space-y-3 relative">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Step {index + 1}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
          onClick={handleRemove}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Delay (days after previous)</Label>
          <Input
            type="number"
            min={0}
            value={step.delayDays}
            onChange={handleDelayChange}
          />
        </div>
        <div className="space-y-1 col-span-2">
          <Label className="text-xs">Subject</Label>
          <Input
            value={step.subject}
            onChange={handleSubjectChange}
            placeholder="Email subject line"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Body (HTML or plain text, use {"{{candidate_name}}"} for personalization)</Label>
        <Textarea
          value={step.htmlBody}
          onChange={handleBodyChange}
          placeholder="Email body..."
          rows={4}
        />
      </div>
    </div>
  );
}

interface SequenceSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sequence?: EmailSequence;
}

function SequenceSheet({ open, onOpenChange, sequence }: SequenceSheetProps) {
  const createMutation = useCreateEmailSequence();
  const updateMutation = useUpdateEmailSequence(sequence?.id ?? 0);
  const isEdit = !!sequence;

  const [name, setName] = useState(sequence?.name ?? "");
  const [description, setDescription] = useState(sequence?.description ?? "");
  const [triggerType, setTriggerType] = useState<EmailSequenceTrigger>(sequence?.triggerType ?? "MANUAL");
  const [steps, setSteps] = useState<StepDraft[]>(
    sequence?.steps?.map((s) => ({
      stepOrder: s.stepOrder,
      delayDays: s.delayDays,
      subject: s.subject,
      htmlBody: s.htmlBody,
    })) ?? []
  );

  const handleOpen = (v: boolean) => {
    if (!v) {
      setName(sequence?.name ?? "");
      setDescription(sequence?.description ?? "");
      setTriggerType(sequence?.triggerType ?? "MANUAL");
      setSteps(sequence?.steps?.map((s) => ({
        stepOrder: s.stepOrder,
        delayDays: s.delayDays,
        subject: s.subject,
        htmlBody: s.htmlBody,
      })) ?? []);
    }
    onOpenChange(v);
  };

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      { stepOrder: prev.length, delayDays: prev.length === 0 ? 0 : 3, subject: "", htmlBody: "" },
    ]);
  };

  const removeStep = (index: number) => {
    setSteps((prev) =>
      prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, stepOrder: i }))
    );
  };

  const updateStep = (index: number, field: keyof StepDraft, value: string | number) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Sequence name is required"); return; }
    if (steps.some((s) => !s.subject.trim() || !s.htmlBody.trim())) {
      toast.error("All steps must have a subject and body");
      return;
    }

    const payload = { name: name.trim(), description: description.trim() || undefined, triggerType, steps };

    try {
      if (isEdit) {
        await updateMutation.mutateAsync(payload);
        toast.success("Sequence updated");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Sequence created");
      }
      handleOpen(false);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) { setName(e.target.value); }
  function handleDescriptionChange(e: React.ChangeEvent<HTMLTextAreaElement>) { setDescription(e.target.value); }
  function handleTriggerChange(v: string) { setTriggerType(v as EmailSequenceTrigger); }
  function handleCancelSheet() { handleOpen(false); }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Email Sequence" : "Create Email Sequence"}</SheetTitle>
          <SheetDescription>Configure a drip campaign for candidates.</SheetDescription>
        </SheetHeader>

        <div className="space-y-5 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="seq-name">Name</Label>
            <Input id="seq-name" value={name} onChange={handleNameChange} placeholder="e.g. Post-Interview Follow-up" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="seq-desc">Description</Label>
            <Textarea id="seq-desc" value={description} onChange={handleDescriptionChange} placeholder="Optional description" rows={2} />
          </div>

          <div className="space-y-1.5">
            <Label>Trigger</Label>
            <Select value={triggerType} onValueChange={handleTriggerChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TRIGGER_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Steps ({steps.length})</Label>
              <Button type="button" variant="outline" size="sm" onClick={addStep}>
                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Step
              </Button>
            </div>

            {steps.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg">
                No steps yet. Add a step to get started.
              </p>
            )}

            {steps.map((step, index) => (
              <StepRow
                key={index}
                step={step}
                index={index}
                onUpdate={updateStep}
                onRemove={removeStep}
              />
            ))}
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={handleCancelSheet} disabled={isPending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving..." : isEdit ? "Save Changes" : "Create Sequence"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

interface SequenceCardProps {
  sequence: EmailSequence;
  togglingId: number | null;
  onToggle: (sequence: EmailSequence) => void;
  onEdit: (sequence: EmailSequence) => void;
  onDelete: (id: number) => void;
}

function SequenceCard({ sequence, togglingId, onToggle, onEdit, onDelete }: SequenceCardProps) {
  const enrollmentCount = sequence.enrollments?.length ?? 0;
  const activeEnrollments = sequence.enrollments?.filter((e) => e.status === "ACTIVE").length ?? 0;

  function handleToggle() { void onToggle(sequence); }
  function handleEdit() { onEdit(sequence); }
  function handleDelete() { onDelete(sequence.id); }

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{sequence.name}</span>
              <Badge variant={sequence.isActive ? "default" : "secondary"} className="text-xs">
                {sequence.isActive ? "Active" : "Paused"}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {TRIGGER_LABELS[sequence.triggerType]}
              </Badge>
            </div>
            {sequence.description && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{sequence.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span>{sequence.steps?.length ?? 0} steps</span>
              <span>{enrollmentCount} enrolled</span>
              {activeEnrollments > 0 && <span className="text-primary">{activeEnrollments} active</span>}
              {sequence.creator && <span>by {sequence.creator.name}</span>}
              <span>{format(new Date(sequence.createdAt), "MMM d, yyyy")}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Switch
              checked={sequence.isActive}
              onCheckedChange={handleToggle}
              disabled={togglingId === sequence.id}
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleEdit}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function EmailSequencesPage() {
  const { data: sequences = [], isLoading } = useEmailSequences();
  const deleteMutation = useDeleteEmailSequence();
  const qc = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSequence, setEditingSequence] = useState<EmailSequence | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const handleToggleActive = useCallback(async (sequence: EmailSequence) => {
    setTogglingId(sequence.id);
    try {
      await apiClient.patch(`/hr/recruitment/email-sequences/${sequence.id}`, { isActive: !sequence.isActive });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.emailSequences() });
      toast.success(sequence.isActive ? "Sequence paused" : "Sequence activated");
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setTogglingId(null);
    }
  }, [qc]);

  const handleDelete = useCallback(async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Sequence deleted");
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setDeletingId(null);
    }
  }, [deleteMutation]);

  function handleOpenCreate() { setIsCreateOpen(true); }
  function handleEditSheetChange(v: boolean) { if (!v) setEditingSequence(null); }
  function handleDeleteDialogChange(v: boolean) { if (!v) setDeletingId(null); }
  function handleConfirmDelete() { if (deletingId !== null) void handleDelete(deletingId); }

  const pageActions = (
    <Button size="sm" onClick={handleOpenCreate}>
      <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      New Sequence
    </Button>
  );

  if (isLoading) {
    return (
      <PageWrapper title="Email Sequences" subtitle="Automated drip campaigns for candidates." actions={pageActions}>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Email Sequences" subtitle="Automated drip campaigns to nurture candidates at each pipeline stage." actions={pageActions}>
      {sequences.length === 0 ? (
        <EmptyState
          illustration={<EmptyMailIllustration />}
          title="No email sequences"
          description="Create your first drip campaign to automatically follow up with candidates."
          action={{ label: "New Sequence", onClick: handleOpenCreate }}
        />
      ) : (
        <div className="space-y-3">
          {sequences.map((sequence) => (
            <SequenceCard
              key={sequence.id}
              sequence={sequence}
              togglingId={togglingId}
              onToggle={handleToggleActive}
              onEdit={setEditingSequence}
              onDelete={setDeletingId}
            />
          ))}
        </div>
      )}

      <SequenceSheet open={isCreateOpen} onOpenChange={setIsCreateOpen} />

      {editingSequence && (
        <SequenceSheet
          open={!!editingSequence}
          onOpenChange={handleEditSheetChange}
          sequence={editingSequence}
        />
      )}

      <AlertDialog open={deletingId !== null} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Email Sequence</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the sequence and all its steps. Active enrollments will stop immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
