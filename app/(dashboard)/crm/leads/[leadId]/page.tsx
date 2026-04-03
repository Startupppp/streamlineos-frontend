"use client";

import { use, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { api } from "@/trpc/react";
import { toast } from "sonner";

import { LeadDetailHeader } from "./_components/lead-detail-header";
import { LeadInfoCard } from "./_components/lead-info-card";
import { LeadQuickActions } from "./_components/lead-quick-actions";
import { LeadSidebar } from "./_components/lead-sidebar";
import {
  noteSchema,
  taskSchema,
  emailSchema,
  callSchema,
  editSchema,
  type QuickAction,
  type PipelineStatus,
  type NoteForm,
  type TaskForm,
  type EmailForm,
  type CallForm,
  type EditForm,
} from "./_components/lead-types";

export default function LeadDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const { leadId: leadIdStr } = use(params);
  const leadId = Number(leadIdStr);
  const router = useRouter();
  const utils = api.useUtils();

  // ─── Data fetching ───────────────────────────────────────────────────────
  const { data: lead, isLoading } = api.leads.getById.useQuery({ id: leadId });
  const { data: timeline, isLoading: timelineLoading } =
    api.leadDetails.getTimeline.useQuery(
      { leadId, limit: 50 },
      { enabled: !!leadId }
    );

  // ─── Local UI state ──────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [activeAction, setActiveAction] = useState<QuickAction>(null);

  // ─── Mutations ───────────────────────────────────────────────────────────
  const updateLead = api.leads.update.useMutation({
    onSuccess: () => {
      utils.leads.getById.invalidate({ id: leadId });
      toast.success("Lead updated");
      setIsEditing(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateStatus = api.leads.updateStatus.useMutation({
    onSuccess: () => {
      utils.leads.getById.invalidate({ id: leadId });
      toast.success("Status updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const createNote = api.leadDetails.createNote.useMutation({
    onSuccess: () => {
      utils.leadDetails.getTimeline.invalidate({ leadId });
      toast.success("Note added");
      setActiveAction(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const createTask = api.leadDetails.createTask.useMutation({
    onSuccess: () => {
      utils.leadDetails.getTimeline.invalidate({ leadId });
      toast.success("Task created");
      setActiveAction(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const sendEmailMutation = api.leadDetails.sendEmail.useMutation({
    onSuccess: () => {
      utils.leadDetails.getTimeline.invalidate({ leadId });
      toast.success("Email sent");
      setActiveAction(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const logActivity = api.leads.logActivity.useMutation({
    onSuccess: () => {
      utils.leads.getById.invalidate({ id: leadId });
      utils.leadDetails.getTimeline.invalidate({ leadId });
      toast.success("Call logged");
      setActiveAction(null);
    },
    onError: (err) => toast.error(err.message),
  });

  // ─── Forms ───────────────────────────────────────────────────────────────
  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    values: lead
      ? {
          name: lead.name,
          email: lead.email ?? "",
          phone: lead.phone ?? "",
          company: lead.company ?? "",
          city: lead.city ?? "",
          priority: (lead.priority as "HOT" | "WARM" | "COLD") ?? "WARM",
          potentialValue: lead.potentialValue ?? "",
          investmentInterest: lead.investmentInterest ?? "",
          notes: lead.notes ?? "",
        }
      : undefined,
  });

  const noteForm = useForm<NoteForm>({ resolver: zodResolver(noteSchema) });
  const taskForm = useForm<TaskForm>({ resolver: zodResolver(taskSchema) });
  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: { to: lead?.email ?? "" },
  });
  const callForm = useForm<CallForm>({ resolver: zodResolver(callSchema) });

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleStatusChange = useCallback(
    (status: PipelineStatus) => {
      updateStatus.mutate({
        leadId,
        status,
        expectedStatus: (lead as any)?.status as PipelineStatus,
      });
    },
    [leadId, updateStatus, lead]
  );

  const onEditSubmit = useCallback(
    (data: EditForm) => {
      updateLead.mutate({ id: leadId, ...data });
    },
    [leadId, updateLead]
  );

  const onNoteSubmit = useCallback(
    (data: NoteForm) => {
      createNote.mutate({ leadId, body: data.body });
      noteForm.reset();
    },
    [leadId, createNote, noteForm]
  );

  const onTaskSubmit = useCallback(
    (data: TaskForm) => {
      createTask.mutate({
        leadId,
        title: data.title,
        dueDate: data.dueDate || undefined,
      });
      taskForm.reset();
    },
    [leadId, createTask, taskForm]
  );

  const onEmailSubmit = useCallback(
    (data: EmailForm) => {
      sendEmailMutation.mutate({
        leadId,
        to: data.to,
        subject: data.subject,
        body: data.body,
      });
    },
    [leadId, sendEmailMutation]
  );

  const onCallSubmit = useCallback(
    (data: CallForm) => {
      logActivity.mutate({
        leadId,
        type: "call",
        date: new Date().toISOString(),
        subject: data.subject || undefined,
        duration: data.duration ? Number(data.duration) : undefined,
        outcome: data.outcome || undefined,
        notes: data.notes || undefined,
      });
      callForm.reset();
    },
    [leadId, logActivity, callForm]
  );

  // ─── Loading / not-found guards ──────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-5">
          <Skeleton className="h-[600px] lg:col-span-3" />
          <Skeleton className="h-[600px] lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <p className="text-muted-foreground">Lead not found</p>
        <Button variant="outline" onClick={() => router.push("/crm/leads")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Pipeline
        </Button>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <motion.div
      className="space-y-6 p-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <LeadDetailHeader
        lead={lead}
        isEditing={isEditing}
        onToggleEdit={() => setIsEditing((prev) => !prev)}
        onStatusChange={handleStatusChange}
      />

      <motion.div variants={fadeUp} className="grid gap-6 lg:grid-cols-5">
        {/* ── Main column ──────────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-6">
          <LeadInfoCard
            lead={lead}
            isEditing={isEditing}
            editForm={editForm}
            isUpdatePending={updateLead.isPending}
            onEditSubmit={onEditSubmit}
            onCancelEdit={() => setIsEditing(false)}
          />

          <LeadQuickActions
            activeAction={activeAction}
            onSetActiveAction={setActiveAction}
            noteForm={noteForm}
            taskForm={taskForm}
            emailForm={emailForm}
            callForm={callForm}
            onNoteSubmit={onNoteSubmit}
            onTaskSubmit={onTaskSubmit}
            onEmailSubmit={onEmailSubmit}
            onCallSubmit={onCallSubmit}
            isNotePending={createNote.isPending}
            isTaskPending={createTask.isPending}
            isEmailPending={sendEmailMutation.isPending}
            isCallPending={logActivity.isPending}
          />
        </div>

        {/* ── Sidebar column ───────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <LeadSidebar
            lead={lead}
            timeline={timeline}
            timelineLoading={timelineLoading}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
