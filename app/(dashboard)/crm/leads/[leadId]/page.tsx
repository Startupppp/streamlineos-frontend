"use client";

import { use, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useLeadDetail, useLeadTimeline, useUpdateLead, useUpdateLeadStatus, useLogLeadActivity } from "@/lib/api/hooks/leads";
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

  // ─── Data fetching ───────────────────────────────────────────────────────
  const { data: lead, isLoading } = useLeadDetail(leadId);
  const { data: timeline, isLoading: timelineLoading } = useLeadTimeline(leadId, 50);

  // ─── Local UI state ──────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [activeAction, setActiveAction] = useState<QuickAction>(null);

  // ─── Mutations ───────────────────────────────────────────────────────────
  const updateLeadMutation = useUpdateLead();
  const updateStatusMutation = useUpdateLeadStatus();
  const logActivityMutation = useLogLeadActivity();

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
      updateStatusMutation.mutate(
        { leadId, status, expectedStatus: lead?.status as PipelineStatus },
        {
          onSuccess: () => toast.success("Status updated"),
          onError: (err) => toast.error(err.message),
        }
      );
    },
    [leadId, updateStatusMutation, lead]
  );

  const onEditSubmit = useCallback(
    (data: EditForm) => {
      updateLeadMutation.mutate(
        { id: leadId, ...data },
        {
          onSuccess: () => { toast.success("Lead updated"); setIsEditing(false); },
          onError: (err) => toast.error(err.message),
        }
      );
    },
    [leadId, updateLeadMutation]
  );

  const onNoteSubmit = useCallback(
    (data: NoteForm) => {
      logActivityMutation.mutate(
        { leadId, type: "note", date: new Date().toISOString(), notes: data.body },
        {
          onSuccess: () => { toast.success("Note added"); setActiveAction(null); noteForm.reset(); },
          onError: (err) => toast.error(err.message),
        }
      );
    },
    [leadId, logActivityMutation, noteForm]
  );

  const onTaskSubmit = useCallback(
    (data: TaskForm) => {
      logActivityMutation.mutate(
        { leadId, type: "task", date: new Date().toISOString(), subject: data.title, notes: data.dueDate || undefined },
        {
          onSuccess: () => { toast.success("Task created"); setActiveAction(null); taskForm.reset(); },
          onError: (err) => toast.error(err.message),
        }
      );
    },
    [leadId, logActivityMutation, taskForm]
  );

  const onEmailSubmit = useCallback(
    (data: EmailForm) => {
      logActivityMutation.mutate(
        { leadId, type: "email", date: new Date().toISOString(), subject: data.subject, notes: `To: ${data.to}\n\n${data.body}` },
        {
          onSuccess: () => { toast.success("Email sent"); setActiveAction(null); },
          onError: (err) => toast.error(err.message),
        }
      );
    },
    [leadId, logActivityMutation]
  );

  const onCallSubmit = useCallback(
    (data: CallForm) => {
      logActivityMutation.mutate(
        {
          leadId,
          type: "call",
          date: new Date().toISOString(),
          subject: data.subject || undefined,
          duration: data.duration ? Number(data.duration) : undefined,
          outcome: data.outcome || undefined,
          notes: data.notes || undefined,
        },
        {
          onSuccess: () => { toast.success("Call logged"); setActiveAction(null); callForm.reset(); },
          onError: (err) => toast.error(err.message),
        }
      );
    },
    [leadId, logActivityMutation, callForm]
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
    <PageWrapper
      title={lead.name}
      actions={
        <Button variant="outline" size="sm" onClick={() => router.push("/crm/leads")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Pipeline
        </Button>
      }
    >
      <motion.div
        className="space-y-6"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <LeadDetailHeader
          lead={lead as unknown as Parameters<typeof LeadDetailHeader>[0]["lead"]}
          isEditing={isEditing}
          onToggleEdit={() => setIsEditing((prev) => !prev)}
          onStatusChange={handleStatusChange}
        />

        <motion.div variants={fadeUp} className="grid gap-6 lg:grid-cols-5">
          {/* ── Main column ──────────────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-6">
            <LeadInfoCard
              lead={lead as unknown as Parameters<typeof LeadInfoCard>[0]["lead"]}
              isEditing={isEditing}
              editForm={editForm}
              isUpdatePending={updateLeadMutation.isPending}
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
              isNotePending={logActivityMutation.isPending}
              isTaskPending={logActivityMutation.isPending}
              isEmailPending={logActivityMutation.isPending}
              isCallPending={logActivityMutation.isPending}
            />
          </div>

          {/* ── Sidebar column ───────────────────────────────────────────── */}
          <div className="lg:col-span-2">
            <LeadSidebar
              lead={lead as unknown as Parameters<typeof LeadSidebar>[0]["lead"]}
              timeline={timeline}
              timelineLoading={timelineLoading}
            />
          </div>
        </motion.div>
      </motion.div>
    </PageWrapper>
  );
}
